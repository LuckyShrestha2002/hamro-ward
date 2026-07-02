// Shared date/time formatting so dates look identical everywhere.

function valid(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** e.g. "23 Jun 2026" */
export function formatDate(iso: string): string {
  const d = valid(iso);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** e.g. "23 Jun 2026, 14:30" */
export function formatDateTime(iso: string): string {
  const d = valid(iso);
  if (!d) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** e.g. "just now", "5m ago", "3h ago", "2d ago" */
export function timeAgo(iso: string): string {
  const d = valid(iso);
  if (!d) return '—';
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
