import { describe, expect, test } from 'vitest';
import { computeAnalytics } from './analytics';
import type { Report, ReportStatus } from '../types';

let idSeq = 0;

function report(p: Partial<Report> = {}): Report {
  return {
    id: `r-${++idSeq}`,
    tracking_id: null,
    category: 'Streetlight',
    severity: 'Low',
    description_en: null,
    description_np: null,
    ward: null,
    municipality: null,
    location: null,
    latitude: null,
    longitude: null,
    reporter_name: null,
    contact: null,
    nibedan: null,
    english_letter: null,
    recommendation: null,
    ai_confidence: null,
    image_url: null,
    status: 'Reported',
    created_at: '2026-06-15T10:00:00.000Z',
    ...p,
  };
}

describe('computeAnalytics', () => {
  test('handles an empty list without dividing by zero', () => {
    const a = computeAnalytics([]);
    expect(a.total).toBe(0);
    expect(a.resolved).toBe(0);
    expect(a.pending).toBe(0);
    expect(a.resolvedPct).toBe(0);
    expect(a.pendingPct).toBe(0);
    expect(a.resolutionRate).toBe(0);
    expect(a.byCategory).toEqual([]);
    expect(a.byMonth).toEqual([]);
    // Severity buckets are always the fixed Low/Medium/High set.
    expect(a.bySeverity.map((s) => s.name)).toEqual(['Low', 'Medium', 'High']);
    expect(a.bySeverity.every((s) => s.value === 0)).toBe(true);
  });

  test('counts totals, resolved/pending and percentages', () => {
    const statuses: ReportStatus[] = ['Resolved', 'Resolved', 'In Progress', 'Reported'];
    const a = computeAnalytics(statuses.map((status) => report({ status })));
    expect(a.total).toBe(4);
    expect(a.resolved).toBe(2);
    expect(a.inProgress).toBe(1);
    expect(a.pending).toBe(2); // total - resolved
    expect(a.resolvedPct).toBe(50);
    expect(a.pendingPct).toBe(50);
    expect(a.resolutionRate).toBe(50);
  });

  test('byCategory only includes categories that appear', () => {
    const a = computeAnalytics([
      report({ category: 'Streetlight' }),
      report({ category: 'Streetlight' }),
      report({ category: 'Water Supply' }),
    ]);
    const map = Object.fromEntries(a.byCategory.map((c) => [c.name, c.value]));
    expect(map).toEqual({ Streetlight: 2, 'Water Supply': 1 });
    expect(a.byCategory.find((c) => c.name === 'Waste Management')).toBeUndefined();
  });

  test('bySeverity tallies each level in fixed order', () => {
    const a = computeAnalytics([
      report({ severity: 'High' }),
      report({ severity: 'High' }),
      report({ severity: 'Low' }),
    ]);
    expect(a.bySeverity).toEqual([
      { name: 'Low', value: 1 },
      { name: 'Medium', value: 0 },
      { name: 'High', value: 2 },
    ]);
  });

  test('byMonth is bucketed and chronologically sorted', () => {
    const a = computeAnalytics([
      report({ created_at: '2026-03-10T00:00:00.000Z' }),
      report({ created_at: '2026-01-05T00:00:00.000Z' }),
      report({ created_at: '2026-01-20T00:00:00.000Z' }),
    ]);
    expect(a.byMonth).toEqual([
      { month: 'Jan 2026', count: 2 },
      { month: 'Mar 2026', count: 1 },
    ]);
  });
});
