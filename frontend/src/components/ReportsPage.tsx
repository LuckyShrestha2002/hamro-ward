import { Link } from 'react-router-dom';
import ReportsFeed from './ReportsFeed';
import type { UseReports } from '../hooks/useReports';

/** Dedicated page listing all submitted complaints. */
export default function ReportsPage({ reports }: { reports: UseReports }) {
  const showCount = reports.configured && !reports.loading && reports.reports.length > 0;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-8 lg:px-10">
      <div className="mb-8 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1
            className="text-3xl font-extrabold tracking-tight sm:text-5xl"
            style={{ color: '#1a365d' }}
          >
            Recent reports
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-500">
            All civic complaints filed through Hamro Ward, newest first. Track progress and resolve
            community issues together.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {showCount && (
            <span className="text-sm font-semibold text-slate-400">
              {reports.reports.length} total records
            </span>
          )}
          <Link
            to="/report"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            style={{ background: '#1a365d', boxShadow: '0 8px 18px -8px rgba(11,27,63,.6)' }}
          >
            <span aria-hidden className="material-symbols-outlined text-[20px]">
              add
            </span>
            Report an Issue
          </Link>
        </div>
      </div>

      <ReportsFeed
        reports={reports.reports}
        loading={reports.loading}
        configured={reports.configured}
        onStatusChange={reports.changeStatus}
        showHeader={false}
      />
    </div>
  );
}
