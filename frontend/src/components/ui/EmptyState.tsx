import type { ReactNode } from 'react';

/**
 * Consistent empty / not-found / not-configured placeholder.
 * `tone` switches between a neutral and a "needs attention" (amber) look.
 */
export default function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  tone = 'neutral',
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'neutral' | 'warning';
}) {
  const toneCls =
    tone === 'warning'
      ? 'border-amber-300 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-white text-slate-500';
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center ${toneCls}`}
    >
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
