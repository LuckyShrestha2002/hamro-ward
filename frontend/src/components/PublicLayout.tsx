import { Suspense, type ReactNode } from 'react';
import PublicNavbar from './PublicNavbar';
import Footer from './Footer';

function Fallback() {
  return <div className="px-4 py-12 text-center text-sm text-slate-500">Loading…</div>;
}

/** Citizen-facing shell: light navbar + footer. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <Suspense fallback={<Fallback />}>{children}</Suspense>
      </main>
      <Footer />
    </div>
  );
}
