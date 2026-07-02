// Small colored pills for severity and category.
import { SEVERITY_META } from '../lib/status';
import type { Severity } from '../types';

export function SeverityBadge({ severity }: { severity: string | null }) {
  const meta = severity ? SEVERITY_META[severity as Severity] : undefined;
  const cls = meta?.badge ?? 'bg-slate-100 text-slate-600';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}
    >
      {meta && <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
      {severity || 'Unknown'}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
      {category}
    </span>
  );
}
