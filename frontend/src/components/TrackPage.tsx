import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReportByTrackingId, getStatusHistory } from '../lib/reports';
import { isSupabaseConfigured } from '../lib/supabase';
import { SeverityBadge, CategoryBadge } from './Badges';
import DownloadPdfButton from './DownloadPdfButton';
import NibedanDocument from './NibedanDocument';
import RecommendationCard from './RecommendationCard';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import { elementToPdfPrint } from '../lib/pdf';
import { STATUS_META } from '../lib/status';
import { categoryMeta } from '../data/wards';
import { formatDateTime } from '../lib/format';
import type { Report, ReportStatus, ReportStatusHistory } from '../types';

// Leaflet is heavy — load the mini map only when a located complaint is shown.
const TrackMiniMap = lazy(() => import('./TrackMiniMap'));

const WORKFLOW: ReportStatus[] = ['Reported', 'Under Review', 'In Progress', 'Resolved'];
const STEP_LABEL: Record<ReportStatus, string> = {
  Reported: 'Complaint Submitted',
  'Under Review': 'Under Review',
  'In Progress': 'In Progress',
  Resolved: 'Resolved',
};

function Icon({ name, className = '', filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}>
      {name}
    </span>
  );
}

export default function TrackPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('id') ?? '');
  const [result, setResult] = useState<Report | null>(null);
  const [history, setHistory] = useState<ReportStatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [nibedanOpen, setNibedanOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printDocRef = useRef<HTMLDivElement>(null);

  async function runSearch(trackingId: string) {
    const id = trackingId.trim();
    if (!id) return;
    setLoading(true);
    setError('');
    setSearched(true);
    setNibedanOpen(false);
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

  async function handlePrint() {
    if (!printDocRef.current) return;
    setPrinting(true);
    try {
      await elementToPdfPrint(printDocRef.current);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Print failed', err);
      alert('Sorry, the complaint could not be prepared for printing. Please try again.');
    } finally {
      setPrinting(false);
    }
  }

  const currentIndex = result ? WORKFLOW.indexOf(result.status) : -1;
  const historyAt = (status: ReportStatus) =>
    history.find((h) => h.status === status)?.created_at ?? null;
  const resolvedAt = historyAt('Resolved');
  const nibedanText = result ? result.nibedan || result.english_letter : null;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8 lg:px-10">
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
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* LEFT — status + timeline */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <FoundIllustration />
                <div className="min-w-0 flex-1 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Icon name="check_circle" className="text-[22px] text-emerald-600" />
                    <h2 className="text-lg font-extrabold text-emerald-600">Complaint found!</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Your complaint has been successfully submitted and processed.
                  </p>
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-6 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tracking ID
                    </p>
                    <div className="mt-1 flex items-center justify-center gap-2.5">
                      <p className="break-all font-mono text-2xl font-bold text-blue-800">
                        {result.tracking_id}
                      </p>
                      <CopyIdButton trackingId={result.tracking_id} />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <DownloadPdfButton report={result} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-700">Live tracking</h3>
              <ol className="mt-5">
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
                      <div className={`min-w-0 flex-1 pb-7 ${done || active ? '' : 'opacity-50'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p
                              className={`text-sm font-bold ${active ? 'text-amber-600' : 'text-slate-800'}`}
                            >
                              {STEP_LABEL[step]}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {ts ? formatDateTime(ts) : 'Pending'}
                            </p>
                          </div>
                          {done && (
                            <span className="mt-0.5 flex-shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                              Completed
                            </span>
                          )}
                          {active && (
                            <span className="mt-0.5 flex-shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                              In progress
                            </span>
                          )}
                        </div>
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
              {result.status === 'Resolved' && (
                <div className="mt-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  ℹ️ This complaint has been resolved.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <h3 className="text-sm font-bold text-blue-900">ℹ️ What happens next?</h3>
              <p className="mt-2 text-sm text-slate-600">
                Your complaint is routed to the assigned ward office. As staff review and act on it,
                its status moves through the workflow above — check back here anytime with your
                tracking ID.
              </p>
            </div>
          </div>

          {/* RIGHT — evidence + complaint detail */}
          <div className="space-y-6">
            <div className="card p-5">
              {/* Evidence gallery */}
              <EvidenceGallery key={result.id} report={result} />

              {/* Status badges */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <CategoryBadge category={result.category} />
                <SeverityBadge severity={result.severity} />
                <StatusBadge status={result.status} />
              </div>

              {/* Description */}
              {result.description_en && (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{result.description_en}</p>
              )}

              {/* Complaint information grid */}
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                <InfoCell icon="account_balance" label="Municipality" value={result.municipality || '—'} />
                <InfoCell icon="tag" label="Ward" value={result.ward ? `Ward ${result.ward}` : '—'} />
                <InfoCell icon="location_on" label="Location" value={result.location || '—'} />
                <InfoCell icon="calendar_today" label="Reported On" value={formatDateTime(result.created_at)} />
                {resolvedAt && (
                  <InfoCell icon="event_available" label="Resolved On" value={formatDateTime(resolvedAt)} />
                )}
              </div>
            </div>

            {/* AI analysis */}
            {(result.description_en || result.ai_confidence != null) && (
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <Icon name="auto_awesome" filled className="text-[18px] text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">AI Analysis</h3>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-medium text-slate-400">Detected Issue</div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                      <span>{categoryMeta(result.category).icon}</span>
                      {result.category}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-400">Confidence Score</div>
                    {result.ai_confidence != null ? (
                      <>
                        <div className="mt-1 text-sm font-bold text-emerald-600">
                          {result.ai_confidence}%
                        </div>
                        <div className="mt-1.5 h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${result.ai_confidence}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 text-sm font-semibold text-slate-400">Not recorded</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-400">Severity</div>
                    <div className="mt-1">
                      <SeverityBadge severity={result.severity} />
                    </div>
                  </div>
                </div>
                {result.description_en && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="text-xs font-medium text-slate-400">Summary</div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{result.description_en}</p>
                  </div>
                )}
              </div>
            )}

            {result.recommendation && <RecommendationCard recommendation={result.recommendation} />}

            {/* Location map */}
            {result.latitude != null && result.longitude != null && (
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <Icon name="location_on" className="text-[18px] text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-800">Location Map</h3>
                </div>
                <div className="relative z-0 mt-3 overflow-hidden rounded-xl border border-slate-200">
                  <Suspense fallback={<div className="h-[200px] animate-pulse bg-slate-100" />}>
                    <TrackMiniMap
                      lat={result.latitude}
                      lng={result.longitude}
                      category={result.category}
                    />
                  </Suspense>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="np min-w-0 flex-1 truncate text-sm text-slate-600">
                    {[result.location, result.ward ? `Ward ${result.ward}` : null, result.municipality]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${result.latitude},${result.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-blue-700 transition hover:bg-slate-50"
                  >
                    Open in Maps
                    <Icon name="open_in_new" className="text-[14px]" />
                  </a>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="card p-5">
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setNibedanOpen(true)}
                  disabled={!nibedanText}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <Icon name="description" className="text-[18px] text-slate-400" />
                  View Generated Nibedan
                </button>
                <button
                  type="button"
                  onClick={() => void handlePrint()}
                  disabled={printing}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Icon name="print" className="text-[18px] text-slate-400" />
                  {printing ? 'Preparing…' : 'Print Complaint'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nibedan viewer */}
      {nibedanOpen && result && nibedanText && (
        <div
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={() => setNibedanOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-800">
                Generated Nibedan · <span className="np">निवेदन</span>
              </h3>
              <button
                onClick={() => setNibedanOpen(false)}
                aria-label="Close nibedan"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                <Icon name="close" className="text-[18px] text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <pre className="np-body whitespace-pre-wrap text-[14px] text-slate-800" style={{ lineHeight: 1.9 }}>
                {nibedanText}
              </pre>
            </div>
            <div className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
              <DownloadPdfButton report={result} />
            </div>
          </div>
        </div>
      )}

      {/* Hidden print-ready document for the "Print Complaint" action. */}
      {result && (
        <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
          <NibedanDocument ref={printDocRef} report={result} />
        </div>
      )}
    </div>
  );
}

/** Compact evidence gallery: medium main image, counter, fullscreen link and
 * thumbnail strip (thumbnails/counter only when there is more than one image). */
function EvidenceGallery({ report }: { report: Report }) {
  const images = [report.image_url].filter((u): u is string => !!u);
  const [idx, setIdx] = useState(0);
  const meta = categoryMeta(report.category);
  const main = images[idx] ?? null;

  return (
    <div>
      <div className="group relative overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        {main ? (
          <img src={main} alt={report.category} className="h-60 w-full object-cover" />
        ) : (
          <div
            className="flex h-48 items-center justify-center"
            style={{ background: meta.gradient }}
          >
            <span className="text-5xl drop-shadow-lg">{meta.icon}</span>
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-md px-2 py-1 text-xs font-bold uppercase text-white ${STATUS_META[report.status]?.dot ?? 'bg-slate-500'}`}
        >
          {report.status}
        </span>
        {main && (
          <a
            href={main}
            target="_blank"
            rel="noreferrer"
            aria-label="View full-size photo"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/55 text-white backdrop-blur transition hover:bg-slate-900/80"
          >
            <Icon name="open_in_full" className="text-[15px]" />
          </a>
        )}
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-md bg-slate-900/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur">
            {idx + 1}/{images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-2.5 flex gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === idx ? 'border-blue-500' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Decorative document-with-checkmark illustration for the found card. */
function FoundIllustration() {
  return (
    <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50">
      <svg width="76" height="88" viewBox="0 0 76 88" fill="none" aria-hidden>
        {/* document */}
        <rect x="2" y="2" width="64" height="80" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
        {/* folded corner */}
        <path d="M50 2h8a8 8 0 0 1 8 8v8L50 2Z" fill="#f1f5f9" />
        {/* text lines */}
        <rect x="12" y="20" width="36" height="6" rx="3" fill="#e2e8f0" />
        <rect x="12" y="34" width="42" height="6" rx="3" fill="#e2e8f0" />
        <rect x="12" y="48" width="28" height="6" rx="3" fill="#e2e8f0" />
        <rect x="12" y="62" width="20" height="6" rx="3" fill="#e2e8f0" />
        {/* check badge */}
        <circle cx="56" cy="62" r="17" fill="#16a34a" stroke="#ffffff" strokeWidth="3" />
        <path
          d="m48.5 62 5 5 10-10"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

/** Copies the tracking ID to the clipboard with brief visual feedback. */
function CopyIdButton({ trackingId }: { trackingId: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!trackingId) return null;
  return (
    <button
      type="button"
      aria-label="Copy tracking ID"
      onClick={() => {
        void navigator.clipboard.writeText(trackingId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-600 transition hover:bg-blue-100"
    >
      <Icon name={copied ? 'check' : 'content_copy'} className="text-[15px]" />
    </button>
  );
}

/** Icon-circle + label + value cell in the complaint information grid. */
function InfoCell({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-500"
        style={{ background: '#eff4ff' }}
      >
        <Icon name={icon} className="text-[17px]" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-400">{label}</div>
        <div className="np break-words text-[13px] font-bold text-slate-800">{value}</div>
      </div>
    </div>
  );
}
