import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { categoryMeta } from '../data/wards';
import { timeAgo } from '../lib/format';
import type { UseReports } from '../hooks/useReports';

/** localStorage key holding when the officer last cleared the bell. */
const SEEN_KEY = 'hw-notif-seen';

function initialLastSeen(): number {
  const stored = localStorage.getItem(SEEN_KEY);
  const t = stored ? Date.parse(stored) : NaN;
  // First visit: treat the last 24h as unread so the bell has context.
  return Number.isFinite(t) ? t : Date.now() - 24 * 60 * 60 * 1000;
}

/** Live date, e.g. "Wed · 02 Jul 2026". */
function today(): string {
  const d = new Date();
  const wd = d.toLocaleDateString('en-US', { weekday: 'short' });
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = d.toLocaleDateString('en-US', { month: 'short' });
  return `${wd} · ${dd} ${mo} ${d.getFullYear()}`;
}

/** Rich navbar for the authority (/admin) area. */
export default function AdminNavbar({ reports }: { reports: UseReports }) {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(initialLastSeen);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Keep the complaint list live while an officer is signed in: refresh on
  // every INSERT into reports (Supabase Realtime — needs the table in the
  // supabase_realtime publication, see auth-rls.sql) plus a 60s polling
  // fallback. Both are quiet so open screens never flash loading skeletons.
  const refresh = reports.refresh;
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('new-reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, () => {
        // setTimeout dodges the supabase-js await-inside-callback deadlock.
        setTimeout(() => void refresh({ quiet: true }), 0);
      })
      .subscribe();
    const poll = setInterval(() => void refresh({ quiet: true }), 60_000);
    return () => {
      void supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [refresh]);

  const isUnread = (createdAt: string) => +new Date(createdAt) > lastSeen;
  const unreadCount = reports.reports.filter((r) => isUnread(r.created_at)).length;
  const recent = reports.reports.slice(0, 8); // listReports orders by created_at desc

  /** Closing the panel marks everything as read. */
  const closeNotif = () => {
    setNotifOpen(false);
    const now = new Date();
    localStorage.setItem(SEEN_KEY, now.toISOString());
    setLastSeen(now.getTime());
  };

  return (
    // z above leaflet's panes/controls (≤1000) so the notification dropdown
    // isn't cut by the dashboard map; below the detail drawer (z-1500+).
    <header className="sticky top-0 z-[1200] border-b border-[#E7E9F4] bg-white/85 backdrop-blur">
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

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2.5">
          <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 lg:inline-flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Live Monitoring
          </span>

          <span className="hidden font-mono text-[12.5px] font-semibold text-[#64748B] xl:block">{today()}</span>

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} new)` : 'Notifications'}
              onClick={() => (notifOpen ? closeNotif() : setNotifOpen(true))}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#E7E9F4] bg-white transition hover:bg-slate-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="#475569" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="#475569" strokeWidth="1.7" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={closeNotif} />
                {/* max-w accounts for the dropdown being anchored to the bell,
                    ~84px in from the right screen edge on phones. */}
                <div className="absolute right-0 top-full z-20 mt-2 w-[380px] max-w-[calc(100vw-84px)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                    <span className="text-sm font-extrabold text-[#1a365d]">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                        {unreadCount} new
                      </span>
                    )}
                    <span className="ml-auto text-[11px] font-semibold text-slate-400">
                      Latest complaints
                    </span>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto">
                    {recent.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-slate-400">
                        No complaints received yet.
                      </p>
                    ) : (
                      recent.map((r) => {
                        const meta = categoryMeta(r.category);
                        const fresh = isUnread(r.created_at);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              closeNotif();
                              navigate(`/track?id=${r.tracking_id ?? ''}`);
                            }}
                            className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                              fresh ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <span
                              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-base"
                              style={{ background: '#eff4ff' }}
                            >
                              {meta.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-[13px] font-bold text-slate-800">
                                  New {r.category} complaint
                                </span>
                                {fresh && (
                                  <span className="flex-shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                                    New
                                  </span>
                                )}
                              </span>
                              <span className="np mt-0.5 block truncate text-[12px] text-slate-500">
                                {[r.location, r.ward ? `Ward ${r.ward}` : null, r.municipality]
                                  .filter(Boolean)
                                  .join(' · ') || 'Location not provided'}
                              </span>
                              <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">
                                {timeAgo(r.created_at)}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User + sign out */}
          <div className="hidden items-center gap-2.5 rounded-full border border-[#E7E9F4] bg-[#F8FAFC] py-1 pl-3 pr-1 sm:flex">
            <span className="text-right leading-tight">
              <span className="block text-[12.5px] font-bold text-[#0F172A]">Ward Officer</span>
            </span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg,#1a365d,#3b82f6)' }}
            >
              WO
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
