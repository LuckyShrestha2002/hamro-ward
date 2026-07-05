import { Link } from 'react-router-dom';

/** Light navbar for the public (citizen) area. */
export default function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#E7E9F4] bg-[#f5f6fb]/85 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex flex-shrink-0 items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
            <path d="M12 2.6 21 7v1.6H3V7l9-4.4Z" fill="#1a365d" />
            <rect x="4.3" y="10" width="2.1" height="7.4" fill="#1a365d" />
            <rect x="8.5" y="10" width="2.1" height="7.4" fill="#1a365d" />
            <rect x="13.4" y="10" width="2.1" height="7.4" fill="#1a365d" />
            <rect x="17.6" y="10" width="2.1" height="7.4" fill="#1a365d" />
            <rect x="3" y="18.4" width="18" height="2.4" rx="0.6" fill="#1a365d" />
          </svg>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-extrabold text-[#1a365d]">Hamro Ward</span>
            <span className="np text-xs font-semibold text-[#3B5488]">हाम्रो वडा</span>
          </span>
        </Link>

        <div className="min-w-0 flex-1" />

        {/* Right actions */}
        <div className="flex flex-shrink-0 items-center gap-3">
          <Link
            to="/admin"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#4A5A78] transition hover:text-[#1a365d] sm:inline-flex"
            title="Ward authority login"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Authority
          </Link>
        </div>
      </div>
    </header>
  );
}
