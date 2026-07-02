import { SEVERITY_META } from '../lib/status';
import type { Recommendation, Severity } from '../types';

export default function RecommendationCard({
  recommendation,
  loading,
}: {
  recommendation: Recommendation | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div
        className="rounded-2xl border border-blue-200 p-5"
        style={{ background: 'linear-gradient(160deg,#eff6ff,#f5f9ff)' }}
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-blue-800">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          Generating recommendation…
        </p>
      </div>
    );
  }

  if (!recommendation) return null;

  const meta = SEVERITY_META[recommendation.suggested_priority as Severity];
  const priorityCls = meta?.badge ?? 'bg-slate-100 text-slate-600';

  return (
    <div
      className="rounded-2xl border border-blue-200 p-5"
      style={{ background: 'linear-gradient(160deg,#eff6ff,#f5f9ff)' }}
    >
      <div className="text-[15px] font-bold text-blue-800">💡 AI Recommendation</div>

      <div className="mt-3 text-xs font-bold tracking-[0.04em] text-blue-600">
        RECOMMENDED RESPONSE
      </div>
      <p className="mt-1 text-[14.5px] font-medium leading-relaxed text-slate-800">
        {recommendation.recommended_action}
      </p>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <div className="text-[11px] font-bold text-slate-500">PRIORITY</div>
          <span
            className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${priorityCls}`}
          >
            {recommendation.suggested_priority}
          </span>
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-500">RESPONSE URGENCY</div>
          <div className="mt-2 text-sm font-bold text-slate-900">⏱ {recommendation.urgency}</div>
        </div>
      </div>
    </div>
  );
}
