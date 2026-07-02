import { Suspense, type ReactNode } from 'react';
import AdminGate from './AdminGate';
import AdminNavbar from './AdminNavbar';

function Fallback() {
  return <div className="px-4 py-12 text-center text-sm text-slate-500">Loading…</div>;
}

/** Authority-facing shell: passcode gate + rich navbar (no footer, so the
 *  dashboard can fill the viewport). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGate>
      <div className="flex min-h-screen flex-col">
        <AdminNavbar />
        <main className="flex-1">
          <Suspense fallback={<Fallback />}>{children}</Suspense>
        </main>
      </div>
    </AdminGate>
  );
}
