import { useCallback, useEffect, useState } from 'react';
import { listReports, updateReportStatus } from '../lib/reports';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Report, ReportStatus } from '../types';

export interface UseReports {
  reports: Report[];
  loading: boolean;
  error: string;
  configured: boolean;
  refresh: () => Promise<void>;
  changeStatus: (id: string, status: ReportStatus) => Promise<void>;
  prepend: (report: Report) => void;
}

/**
 * Loads reports from Supabase and keeps them in sync after status changes.
 */
export function useReports(): UseReports {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setReports(await listReports());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh whenever auth state settles or changes. onAuthStateChange fires an
  // initial event on subscribe, so this also covers the first load with the
  // correct auth context (staff see all rows; anon see none, per RLS). The
  // setTimeout avoids the supabase-js "don't await inside the callback" pitfall.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => void refresh(), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const changeStatus = useCallback(async (id: string, status: ReportStatus) => {
    // Optimistic update, rolled back on error.
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await updateReportStatus(id, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
      void refresh();
    }
  }, [refresh]);

  const prepend = useCallback((report: Report) => {
    setReports((prev) => [report, ...prev]);
  }, []);

  return {
    reports,
    loading,
    error,
    configured: isSupabaseConfigured,
    refresh,
    changeStatus,
    prepend,
  };
}
