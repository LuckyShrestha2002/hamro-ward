import type { Report } from '../types';
import { CATEGORIES, SEVERITIES } from '../data/wards';

export interface NameValue {
  name: string;
  value: number;
}

export interface MonthBucket {
  month: string; // e.g. "Jan 2026"
  count: number;
}

export interface Analytics {
  total: number;
  resolved: number;
  pending: number;
  inProgress: number;
  resolvedPct: number; // 0–100
  pendingPct: number; // 0–100
  resolutionRate: number; // 0–100
  byCategory: NameValue[];
  bySeverity: NameValue[];
  byMonth: MonthBucket[];
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Aggregate a list of reports into dashboard metrics. */
export function computeAnalytics(reports: Report[]): Analytics {
  const total = reports.length;
  const resolved = reports.filter((r) => r.status === 'Resolved').length;
  const inProgress = reports.filter((r) => r.status === 'In Progress').length;
  const pending = total - resolved;
  const resolvedPct = total === 0 ? 0 : Math.round((resolved / total) * 100);
  const pendingPct = total === 0 ? 0 : Math.round((pending / total) * 100);
  const resolutionRate = resolvedPct;

  // Category breakdown (only categories that appear).
  const byCategory: NameValue[] = CATEGORIES.map((c) => ({
    name: c,
    value: reports.filter((r) => r.category === c).length,
  })).filter((d) => d.value > 0);

  // Severity breakdown (fixed order Low/Medium/High).
  const bySeverity: NameValue[] = SEVERITIES.map((s) => ({
    name: s,
    value: reports.filter((r) => r.severity === s).length,
  }));

  // Monthly breakdown, chronologically sorted.
  const monthMap = new Map<string, number>();
  for (const r of reports) {
    const d = new Date(r.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  const byMonth: MonthBucket[] = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const [year, m] = key.split('-');
      return { month: `${MONTH_LABELS[Number(m)]} ${year}`, count };
    });

  return {
    total,
    resolved,
    pending,
    inProgress,
    resolvedPct,
    pendingPct,
    resolutionRate,
    byCategory,
    bySeverity,
    byMonth,
  };
}
