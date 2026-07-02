import type { Category, Severity, ReportStatus } from '../types';

// ---- Municipalities (Kathmandu Valley) ----
export interface Municipality {
  /** Canonical English name — stored in the DB `municipality` column. */
  name: string;
  /** Nepali name (used in the nibedan / Devanagari UI). */
  nameNp: string;
  /** Number of wards in this municipality. */
  wardCount: number;
}

export const MUNICIPALITIES: Municipality[] = [
  { name: 'Kathmandu Metropolitan City', nameNp: 'काठमाडौं महानगरपालिका', wardCount: 32 },
  { name: 'Lalitpur Metropolitan City', nameNp: 'ललितपुर महानगरपालिका', wardCount: 29 },
  { name: 'Bhaktapur Municipality', nameNp: 'भक्तपुर नगरपालिका', wardCount: 10 },
];

export const DEFAULT_MUNICIPALITY = MUNICIPALITIES[0].name;

/** Ward numbers (1..N) for a given municipality name. */
export function wardsFor(municipalityName: string): number[] {
  const m = MUNICIPALITIES.find((x) => x.name === municipalityName);
  const count = m?.wardCount ?? 32;
  return Array.from({ length: count }, (_, i) => i + 1);
}

/** Nepali name for a municipality (falls back to the English name). */
export function municipalityNp(name: string | null): string {
  return MUNICIPALITIES.find((x) => x.name === name)?.nameNp ?? name ?? '';
}

// The categories the AI is allowed to return — kept in sync with the backend prompt.
export const CATEGORIES: Category[] = [
  'Pothole / Road',
  'Streetlight',
  'Water Supply',
  'Waste Management',
  'Other',
];

export const SEVERITIES: Severity[] = ['Low', 'Medium', 'High'];

export const STATUSES: ReportStatus[] = ['Reported', 'Under Review', 'In Progress', 'Resolved'];

/** Icon + thumbnail gradient per category (used in feed cards, map popups, tables). */
export const CATEGORY_META: Record<string, { icon: string; gradient: string }> = {
  'Pothole / Road': { icon: '🛠️', gradient: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' },
  Streetlight: { icon: '💡', gradient: 'linear-gradient(135deg,#92400e,#f59e0b)' },
  'Water Supply': { icon: '🚰', gradient: 'linear-gradient(135deg,#0e7490,#06b6d4)' },
  'Waste Management': { icon: '🗑️', gradient: 'linear-gradient(135deg,#3f6212,#84cc16)' },
  Other: { icon: '📌', gradient: 'linear-gradient(135deg,#475569,#94a3b8)' },
};

export function categoryMeta(category: string) {
  return CATEGORY_META[category] ?? CATEGORY_META.Other;
}

/** Short municipality label for compact card/table display. */
export function municipalityShort(name: string | null): string {
  if (!name) return '';
  return name.replace('Metropolitan City', 'MC').replace('Municipality', '').trim();
}
