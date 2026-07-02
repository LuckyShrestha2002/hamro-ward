import { Link } from 'react-router-dom';
import HeroWorkflow from './HeroWorkflow';

const STEPS = [
  {
    num: '1',
    title: 'Snap a Photo',
    desc: 'See a problem? Take a clear picture using the app or mobile browser.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h5l1.5 2h2A1.5 1.5 0 0 1 18 8.5V17a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 3 17V8.5Z"
          stroke="#1a365d"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="10.5" cy="12.5" r="3" stroke="#1a365d" strokeWidth="1.8" />
        <path d="M19 5.5h3M20.5 4v3" stroke="#1a365d" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: '2',
    title: 'AI Processes',
    desc: 'Our AI identifies the issue and categorizes it for the specific department automatically.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="8" width="14" height="11" rx="2.5" stroke="#1a365d" strokeWidth="1.8" />
        <path d="M12 4.5V8M9 5h6" stroke="#1a365d" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="9.5" cy="13" r="1.3" fill="#1a365d" />
        <circle cx="14.5" cy="13" r="1.3" fill="#1a365d" />
        <path d="M3.5 12v3M20.5 12v3" stroke="#1a365d" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: '3',
    title: 'Action Taken',
    desc: 'The Ward Office receives a formal application and begins work. You track every update.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.5" stroke="#1a365d" strokeWidth="1.8" />
        <path
          d="M8.5 12.3 11 14.8l4.8-5.2"
          stroke="#1a365d"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div style={{ color: '#1a365d' }}>
      {/* HERO */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            'radial-gradient(900px 560px at 86% 26%, #E9EEFB 0%, rgba(233,238,251,0) 62%), #F5F6FB',
        }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
          {/* LEFT */}
          <div className="min-w-0">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-[#E8EDFB] px-4 py-2">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2.2 14 4l2.7-.5.7 2.6L20 8l-1.3 2.4 1.3 2.4-2.6 1.9-.7 2.6L14 16.8 12 18.6 10 16.8l-2.7.6-.7-2.6L4 12.8 5.3 10.4 4 8l2.6-1.9.7-2.6L10 4l2-1.8Z"
                  fill="#1a365d"
                />
                <path
                  d="M9.2 12.2 11 14l4-4.4"
                  stroke="#E8EDFB"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-xs font-bold tracking-[1px] text-[#21305A]">
                OFFICIAL GOVERNMENT PORTAL
              </span>
            </div>

            <h1 className="mb-6 text-balance text-4xl font-extrabold leading-[1.1] tracking-[-1.2px] text-[#1a365d] sm:text-5xl">
              Report Local Problems Directly to Your Ward
            </h1>

            <p className="mb-9 max-w-[520px] text-lg font-medium leading-relaxed text-[#4A5A78]">
              Upload a photo of local issues — broken street lights, waste, damaged roads, or leaks.
              Our AI instantly generates an official{' '}
              <span className="font-bold text-[#1a365d]">Nibedan</span> and sends it to your Ward
              Office for action.
            </p>

            <div className="mb-12 flex flex-wrap items-center gap-4">
              <Link
                to="/report"
                className="inline-flex items-center gap-3 rounded-xl px-7 py-4 text-base font-bold text-white transition hover:brightness-110"
                style={{
                  background: '#1a365d',
                  boxShadow: '0 16px 30px -12px rgba(11,27,63,.55)',
                }}
              >
                Submit Complaint
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="#fff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border-[1.5px] border-[#CDD3E4] bg-white px-7 py-4 text-base font-bold text-[#1a365d] transition hover:bg-[#F5F7FC]"
              >
                Learn More
              </a>
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-4 text-base font-bold text-[#4A5A78] transition hover:text-[#1a365d]"
                title="Ward authority login"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                Authority Login
              </Link>
            </div>

            {/* Live updates */}
            <div>
              <div className="mb-3.5 text-xs font-bold uppercase tracking-[1.4px] text-[#9098AE]">
                Live Updates
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#FBE3E7] px-4 py-2 text-sm font-bold text-[#B22B3C]">
                  <span
                    className="h-2 w-2 rounded-full bg-[#E5384E]"
                    style={{ animation: 'hw-pulse 1.8s infinite' }}
                  />
                  Submitted
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#E6ECFB] px-4 py-2 text-sm font-bold text-[#2C3E70]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 7v5l3 2"
                      stroke="#2C3E70"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M3.5 9a9 9 0 1 1-.4 4" stroke="#2C3E70" strokeWidth="2" strokeLinecap="round" />
                    <path
                      d="M3 5v4h4"
                      stroke="#2C3E70"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Under Review
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#DCF3E4] px-4 py-2 text-sm font-bold text-[#1C8A4E]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#1C8A4E" strokeWidth="2" />
                    <path
                      d="M8.5 12.2 11 14.6l4.6-5"
                      stroke="#1C8A4E"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Resolved
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT — animated workflow */}
          <HeroWorkflow />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-t border-[#ECEEF6] bg-[#FBFBFE]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-2 text-3xl font-extrabold tracking-[-0.8px] text-[#1a365d]">
            How it works
          </h2>
          <p className="mb-11 text-[17px] font-medium text-[#4A5A78]">
            Three simple steps to make your ward better.
          </p>

          <div className="grid gap-7 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className="rounded-[18px] border border-[#EAEBF4] bg-white p-8"
                style={{ boxShadow: '0 18px 40px -30px rgba(11,27,63,.35)' }}
              >
                <div className="mb-6 flex h-[54px] w-[54px] items-center justify-center rounded-[14px] bg-[#E8EDFB]">
                  {s.icon}
                </div>
                <h3 className="mb-3 text-xl font-extrabold tracking-[-0.4px] text-[#1a365d]">
                  {s.num}. {s.title}
                </h3>
                <p className="text-[15.5px] font-medium leading-relaxed text-[#4A5A78]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
