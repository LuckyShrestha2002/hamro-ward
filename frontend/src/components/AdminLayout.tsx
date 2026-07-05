import { Suspense, type ReactNode } from 'react';
import AdminGate from './AdminGate';
import AdminNavbar from './AdminNavbar';
import type { UseReports } from '../hooks/useReports';

function Fallback() {
  return <div className="px-4 py-12 text-center text-sm text-slate-500">Loading…</div>;
}

/** Authority-facing shell: login gate + rich navbar (no footer, so the
 *  dashboard can fill the viewport). */
export default function AdminLayout({ children, reports }: { children: ReactNode; reports: UseReports }) {
  return (
    <AdminGate>
      <div className="flex min-h-screen flex-col">
        <AdminNavbar reports={reports} />
        <main className="flex-1">
          <Suspense fallback={<Fallback />}>{children}</Suspense>
        </main>
      </div>
    </AdminGate>
  );
}
