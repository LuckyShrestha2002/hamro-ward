import { Link, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const navLink = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-[#E8EDFB] text-[#1a365d]' : 'text-[#4A5A78] hover:text-[#1a365d]'
  }`;

/** Live date, e.g. "Wed · 02 Jul 2026". */
function today(): string {
  const d = new Date();
  const wd = d.toLocaleDateString('en-US', { weekday: 'short' });
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = d.toLocaleDateString('en-US', { month: 'short' });
  return `${wd} · ${dd} ${mo} ${d.getFullYear()}`;
}

/** Rich navbar for the authority (/admin) area. */
export default function AdminNavbar() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#E7E9F4] bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/admin" className="flex flex-shrink-0 items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-[13px]"
            style={{ background: 'linear-gradient(135deg,#1a365d,#3b82f6)', boxShadow: '0 8px 18px -7px rgba(30,58,138,.7)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M12 7.2v9.6M7.6 9.6v4.8M16.4 9.6v4.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-extrabold tracking-tight text-[#1a365d]">Hamro Ward</span>
            <span className="text-[11px] font-semibold text-[#64748B]">Complaint Intelligence Center</span>
          </span>
        </Link>

        <span className="hidden h-7 w-px bg-[#E7E9F4] md:block" />

        {/* Center links */}
        <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
          <NavLink to="/admin" end className={navLink}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/reports" className={navLink}>
            Reports
          </NavLink>
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2.5 md:ml-0">
          <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 lg:inline-flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Live Monitoring
          </span>

          <span className="hidden font-mono text-[12.5px] font-semibold text-[#64748B] xl:block">{today()}</span>

          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#E7E9F4] bg-white transition hover:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="#475569" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="#475569" strokeWidth="1.7" />
            </svg>
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
          </button>

          {/* User + sign out */}
          <div className="hidden items-center gap-2.5 rounded-full border border-[#E7E9F4] bg-[#F8FAFC] py-1 pl-3 pr-1 sm:flex">
            <span className="text-right leading-tight">
              <span className="block text-[12.5px] font-bold text-[#0F172A]">Sujan Maharjan</span>
              <span className="block text-[10.5px] font-semibold text-[#94A3B8]">Ward Officer</span>
            </span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg,#1a365d,#3b82f6)' }}
            >
              SM
            </span>
          </div>

          <button
            type="button"
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E7E9F4] bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 17l-5-5 5-5M4.5 12H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
