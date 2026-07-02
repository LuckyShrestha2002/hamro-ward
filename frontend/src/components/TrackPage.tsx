import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReportByTrackingId, getStatusHistory } from '../lib/reports';
import { isSupabaseConfigured } from '../lib/supabase';
import { SeverityBadge, CategoryBadge } from './Badges';
import DownloadPdfButton from './DownloadPdfButton';
import RecommendationCard from './RecommendationCard';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import { STATUS_META } from '../lib/status';
import { categoryMeta } from '../data/wards';
import { formatDateTime } from '../lib/format';
import type { Report, ReportStatus, ReportStatusHistory } from '../types';

const WORKFLOW: ReportStatus[] = ['Reported', 'Under Review', 'In Progress', 'Resolved'];
const STEP_LABEL: Record<ReportStatus, string> = {
  Reported: 'Complaint Submitted',
  'Under Review': 'Under Review',
  'In Progress': 'In Progress',
  Resolved: 'Resolved',
};

export default function TrackPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('id') ?? '');
  const [result, setResult] = useState<Report | null>(null);
  const [history, setHistory] = useState<ReportStatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  async function runSearch(trackingId: string) {
    const id = trackingId.trim();
    if (!id) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const report = await getReportByTrackingId(id);
      setResult(report);
      setHistory(report ? await getStatusHistory(report.id) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = params.get('id');
    if (id) void runSearch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setParams(query.trim() ? { id: query.trim() } : {});
    void runSearch(query);
  }

  const currentIndex = result ? WORKFLOW.indexOf(result.status) : -1;
  const historyAt = (status: ReportStatus) =>
    history.find((h) => h.status === status)?.created_at ?? null;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Track a complaint</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your full tracking ID (e.g. <span className="font-mono">CMP-2026-0001-A3F9C1</span>) to
          see its current status.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Supabase isn't configured yet. Add credentials to <code>frontend/.env</code> (see README).
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex max-w-xl gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search Tracking ID…"
          aria-label="Tracking ID"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {searched && !loading && !result && !error && (
        <div className="mt-6">
          <EmptyState
            icon="🔍"
            title="No complaint found"
            description="We couldn't find a complaint with that tracking ID. Double-check the ID and try again."
          />
        </div>
      )}

      {result && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* LEFT — status + timeline */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-600">
                ✓
              </div>
              <h2 className="mt-3 text-lg font-bold text-slate-900">Complaint found</h2>
              <div className="mx-auto mt-4 max-w-sm rounded-xl border border-blue-100 bg-blue-50 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tracking ID
                </p>
                <p className="font-mono text-2xl font-bold text-blue-700">{result.tracking_id}</p>
              </div>
              <div className="mt-4 flex justify-center">
                <DownloadPdfButton report={result} />
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-700">Live tracking</h3>
              <ol className="mt-4">
                {WORKFLOW.map((step, i) => {
                  const resolvedFinal = result.status === 'Resolved';
                  const done = i < currentIndex || (resolvedFinal && i === currentIndex);
                  const active = i === currentIndex && !resolvedFinal;
                  const ts = historyAt(step);
                  const isLast = i === WORKFLOW.length - 1;
                  return (
                    <li key={step} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                            done
                              ? 'bg-green-600 text-white'
                              : active
                                ? 'bg-amber-500 text-white'
                                : 'border-2 border-slate-200 bg-slate-100 text-slate-400'
                          }`}
                        >
                          {done ? '✓' : active ? '●' : i + 1}
                        </span>
                        {!isLast && (
                          <span
                            className={`my-1 w-0.5 flex-1 ${done ? 'bg-green-600' : 'bg-slate-200'}`}
                          />
                        )}
                      </div>
                      <div className={`pb-6 ${done || active ? '' : 'opacity-50'}`}>
                        <p
                          className={`text-sm font-bold ${active ? 'text-amber-600' : 'text-slate-800'}`}
                        >
                          {STEP_LABEL[step]}
                        </p>
                        <p className="text-xs text-slate-400">{ts ? formatDateTime(ts) : 'Pending'}</p>
                        {active && (
                          <p className="mt-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-slate-600">
                            This complaint is currently at the “{result.status}” stage.
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* RIGHT — report detail */}
          <div className="space-y-6">
            <div className="card overflow-hidden p-0">
              <div
                className="relative flex h-44 items-center justify-center"
                style={{ background: categoryMeta(result.category).gradient }}
              >
                {result.image_url ? (
                  <img
                    src={result.image_url}
                    alt={result.category}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-5xl drop-shadow-lg">{categoryMeta(result.category).icon}</span>
                )}
                <span
                  className={`absolute left-3 top-3 rounded-md px-2 py-1 text-xs font-bold uppercase text-white ${STATUS_META[result.status]?.dot ?? 'bg-slate-500'}`}
                >
                  {result.status}
                </span>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={result.category} />
                  <SeverityBadge severity={result.severity} />
                  <StatusBadge status={result.status} />
                </div>
                {result.description_en && (
                  <p className="mt-3 text-sm text-slate-600">{result.description_en}</p>
                )}

                <dl className="mt-4 space-y-3 text-sm">
                  <Detail icon="🏷️" label="Category" value={result.category} />
                  <Detail
                    icon="📍"
                    label="Location"
                    value={result.location || `Ward ${result.ward ?? '—'}`}
                  />
                  <Detail
                    icon="🏛️"
                    label="Assigned Ward Office"
                    value={`${result.municipality || 'Municipality'} · Ward ${result.ward ?? '—'}`}
                  />
                  <Detail icon="🗓️" label="Reported on" value={formatDateTime(result.created_at)} />
                </dl>
              </div>
            </div>

            {result.recommendation && <RecommendationCard recommendation={result.recommendation} />}

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <h3 className="text-sm font-bold text-blue-900">ℹ️ What happens next?</h3>
              <p className="mt-2 text-sm text-slate-600">
                Your complaint is routed to the assigned ward office. As staff review and act on it,
                its status moves through the workflow above — check back here anytime with your
                tracking ID.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base">{icon}</span>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="np text-slate-800">{value}</dd>
      </div>
    </div>
  );
}
