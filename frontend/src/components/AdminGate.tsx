import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

/**
 * Gates the authority (`/admin`) area behind a real Supabase Auth session.
 * Only ward staff have accounts, so a valid session === authority. Row-Level
 * Security enforces this on the database too (see supabase/auth-rls.sql).
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }
  if (session) return <>{children}</>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(err.message);
    setBusy(false);
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'radial-gradient(900px 560px at 80% 20%, #e9eefb 0%, rgba(233,238,251,0) 62%), #f5f6fb' }}
    >
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'linear-gradient(135deg,#1a365d,#3b82f6)', boxShadow: '0 10px 22px -8px rgba(30,58,138,.7)' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" stroke="#fff" strokeWidth="1.8" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="15.3" r="1.4" fill="#fff" />
          </svg>
        </div>
        <h1 className="mt-5 text-center text-xl font-extrabold tracking-tight text-[#1a365d]">Authority Login</h1>
        <p className="mt-1.5 text-center text-sm text-slate-500">
          The Complaint Intelligence dashboard is for ward officials. Sign in with your staff account.
        </p>

        <label className="mt-6 block text-xs font-bold text-slate-600">Email</label>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          placeholder="officer@ward.gov.np"
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />

        <label className="mt-4 block text-xs font-bold text-slate-600">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="••••••••"
          className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:ring-2 ${
            error ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-500/20'
          }`}
        />
        {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={busy || !email || !password}
          className="mt-5 w-full rounded-xl py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          style={{ background: '#1a365d', boxShadow: '0 10px 22px -10px rgba(11,27,63,.6)' }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <Link to="/" className="mt-5 block text-center text-xs font-bold text-slate-400 transition hover:text-slate-600">
          ← Back to public site
        </Link>
      </form>
    </div>
  );
}
