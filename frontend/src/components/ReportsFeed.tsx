import EmptyState from './ui/EmptyState';
import Skeleton from './ui/Skeleton';
import { STATUSES, categoryMeta, municipalityShort } from '../data/wards';
import { STATUS_META } from '../lib/status';
import { formatDate } from '../lib/format';
import type { Report, ReportStatus, Severity } from '../types';

const NAVY = '#1a365d';

/** Material Symbol icon per category, matching the reports card design. */
const CATEGORY_ICON: Record<string, string> = {
  'Pothole / Road': 'construction',
  Streetlight: 'lightbulb',
  'Water Supply': 'water_drop',
  'Waste Management': 'delete',
  Other: 'push_pin',
};

/** Overlay severity pill styling (sits on top of the photo). */
const SEVERITY_PILL: Record<Severity, string> = {
  High: 'bg-[#de2e2c] text-white',
  Medium: 'bg-[#d6e3ff] text-[#1a365d]',
  Low: 'bg-emerald-100 text-emerald-700',
};
const SEVERITY_DOT: Record<Severity, string> = {
  High: 'bg-white/80',
  Medium: 'bg-[#1a365d]',
  Low: 'bg-emerald-600',
};

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

function ReportCard({
  report,
  onStatusChange,
}: {
  report: Report;
  onStatusChange: (id: string, status: ReportStatus) => void;
}) {
  const meta = categoryMeta(report.category);
  const sev = report.severity as Severity | null;
  const title = report.location || report.category;

  return (
    <article className="report-card flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Photo (or category gradient fallback) with overlaid badges */}
      <div
        className="relative flex h-56 w-full items-center justify-center"
        style={{ background: meta.gradient }}
      >
        {report.image_url ? (
          <img src={report.image_url} alt={report.category} className="h-full w-full object-cover" />
        ) : (
          <span className="text-6xl drop-shadow-lg">{meta.icon}</span>
        )}
        <div className="absolute left-3 right-3 top-3 flex items-start justify-between">
          <span
            className="rounded-full border border-white/30 px-3 py-1 text-[12px] font-bold backdrop-blur"
            style={{ background: 'rgba(255,255,255,0.85)', color: NAVY }}
          >
            {report.tracking_id}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold ${
              sev ? SEVERITY_PILL[sev] : 'bg-slate-100 text-slate-600'
            }`}
          >
            {sev && <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[sev]}`} />}
            {report.severity || 'Unknown'}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
            style={{ background: '#dce9ff', color: NAVY }}
          >
            <Icon name={CATEGORY_ICON[report.category] ?? 'push_pin'} className="text-[14px]" />
            {report.category}
          </span>
          <span className="text-xs font-semibold text-slate-400">
            {formatDate(report.created_at)}
          </span>
        </div>

        <h3 className="text-xl font-bold" style={{ color: NAVY }}>
          {title}
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <Icon name="location_on" className="text-[18px] text-[#de2e2c]" />
          {municipalityShort(report.municipality)} · Ward {report.ward}
        </div>

        <div className="mt-auto border-t border-slate-100 pt-3">
          <label
            htmlFor={`status-${report.id}`}
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400"
          >
            Status
          </label>
          <div className="relative">
            <select
              id={`status-${report.id}`}
              value={report.status}
              onChange={(e) => onStatusChange(report.id, e.target.value as ReportStatus)}
              className={`w-full appearance-none rounded-lg border px-3 py-2 pr-9 text-[13px] font-bold ${
                STATUS_META[report.status]?.select ?? ''
              }`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Icon
              name="expand_more"
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ReportsFeed({
  reports,
  loading,
  configured,
  onStatusChange,
  showHeader = true,
}: {
  reports: Report[];
  loading: boolean;
  configured: boolean;
  onStatusChange: (id: string, status: ReportStatus) => void;
  showHeader?: boolean;
}) {
  return (
    <section className={showHeader ? 'mt-10' : ''}>
      {showHeader && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Recent reports</h2>
          {configured && !loading && reports.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {reports.length} total
            </span>
          )}
        </div>
      )}

      {!configured ? (
        <EmptyState
          tone="warning"
          icon="⚙️"
          title="Supabase not configured"
          description="Add your credentials to frontend/.env to load and save reports (see README)."
        />
      ) : loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Skeleton className="h-56 rounded-none" />
              <div className="space-y-2.5 p-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No reports yet"
          description="Submitted complaints will appear here. Upload a photo to file your first one."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </section>
  );
}
