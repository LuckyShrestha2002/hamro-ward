export default function Footer() {
  return (
    <footer className="mt-auto bg-[#1a365d] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6 py-10">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2.6 21 7v1.6H3V7l9-4.4Z" fill="#fff" />
              <rect x="4.3" y="10" width="2.1" height="7.4" fill="#fff" />
              <rect x="8.5" y="10" width="2.1" height="7.4" fill="#fff" />
              <rect x="13.4" y="10" width="2.1" height="7.4" fill="#fff" />
              <rect x="17.6" y="10" width="2.1" height="7.4" fill="#fff" />
              <rect x="3" y="18.4" width="18" height="2.4" rx="0.6" fill="#fff" />
            </svg>
            <span className="text-[19px] font-extrabold tracking-[-0.3px] text-white">
              Hamro Ward <span className="np text-[15px] font-bold text-[#C2CADF]">हाम्रो वडा</span>
            </span>
          </div>
          <div className="text-[13px] font-medium text-[#9BA6C4]">
            © 2024 Hamro Ward. Government of Nepal · Digital Governance Portal.
          </div>
        </div>
        <nav className="flex flex-wrap gap-7 text-sm font-medium text-[#C2CADF]">
          <a href="#" className="transition hover:text-white">
            Privacy Policy
          </a>
          <a href="#" className="transition hover:text-white">
            Terms of Service
          </a>
          <a href="#" className="transition hover:text-white">
            Contact Us
          </a>
          <a href="#" className="transition hover:text-white">
            Ward Directory
          </a>
        </nav>
      </div>
    </footer>
  );
}
