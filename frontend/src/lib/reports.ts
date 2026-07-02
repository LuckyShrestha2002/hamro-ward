import { supabase, isSupabaseConfigured, REPORT_IMAGES_BUCKET } from './supabase';
import type { NewReport, Report, ReportStatus, ReportStatusHistory } from '../types';

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env (see README).'
    );
  }
}

/**
 * Upload a photo to the public Storage bucket and return its public URL.
 */
export async function uploadReportImage(file: File): Promise<string> {
  ensureConfigured();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(REPORT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = supabase.storage.from(REPORT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Insert a new report (anonymous). Goes through the create_report() SECURITY
 * DEFINER function so the public never touches the RLS-locked table directly.
 * The DB trigger assigns the tracking_id (CMP-YYYY-NNNN-XXXXXX).
 */
export async function createReport(report: NewReport): Promise<Report> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('create_report', { payload: report });
  if (error) throw new Error(`Could not save report: ${error.message}`);
  return data as Report;
}

/** Fetch all reports, newest first. Staff-only (RLS requires an auth session). */
export async function listReports(): Promise<Report[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load reports: ${error.message}`);
  return (data ?? []) as Report[];
}

/**
 * Minimal, no-PII list of active reports for the citizen-side duplicate check
 * (via the list_active_reports_min() SECURITY DEFINER function).
 */
export async function listActiveReportsMin(): Promise<Report[]> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('list_active_reports_min');
  if (error) throw new Error(`Could not check duplicates: ${error.message}`);
  return (data ?? []) as Report[];
}

/**
 * Look up a single report by its tracking ID (the citizen's access token).
 * Uses get_report_by_tracking_id() so anon can read only this one row.
 */
export async function getReportByTrackingId(trackingId: string): Promise<Report | null> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('get_report_by_tracking_id', {
    p_tid: trackingId.trim(),
  });
  if (error) throw new Error(`Lookup failed: ${error.message}`);
  const rows = (data ?? []) as Report[];
  return rows[0] ?? null;
}

/** Update a report's status. Staff-only. The DB trigger records the change. */
export async function updateReportStatus(id: string, status: ReportStatus): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.from('reports').update({ status }).eq('id', id);
  if (error) throw new Error(`Could not update status: ${error.message}`);
}

/** Fetch the status history timeline for a report (via SECURITY DEFINER RPC). */
export async function getStatusHistory(reportId: string): Promise<ReportStatusHistory[]> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('get_status_history', { p_report_id: reportId });
  if (error) throw new Error(`Could not load history: ${error.message}`);
  return (data ?? []) as ReportStatusHistory[];
}
