import type { ReportStatus, Severity } from '../types';

/**
 * Single source of truth for status styling so the four statuses look identical
 * across the feed, dashboard, map popups, and track page. Colors mirror the
 * approved Hamro Ward design.
 */
export interface StatusMeta {
  /** pill: background + text */
  badge: string;
  /** small dot indicator */
  dot: string;
  /** styled <select> for the editable feed control */
  select: string;
}

export const STATUS_META: Record<ReportStatus, StatusMeta> = {
  Reported: {
    badge: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-500',
    select: 'border-slate-300 bg-slate-50 text-slate-600',
  },
  'Under Review': {
    badge: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-600',
    select: 'border-violet-300 bg-violet-50 text-violet-700',
  },
  'In Progress': {
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
    select: 'border-amber-300 bg-amber-50 text-amber-800',
  },
  Resolved: {
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-green-600',
    select: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  },
};

export const SEVERITY_META: Record<Severity, { badge: string; text: string; bar: string; dot: string }> = {
  Low: { badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600', bar: 'bg-green-600', dot: 'bg-green-600' },
  Medium: { badge: 'bg-amber-100 text-amber-800', text: 'text-amber-600', bar: 'bg-amber-500', dot: 'bg-amber-600' },
  High: { badge: 'bg-red-100 text-red-700', text: 'text-red-600', bar: 'bg-red-600', dot: 'bg-red-600' },
};
