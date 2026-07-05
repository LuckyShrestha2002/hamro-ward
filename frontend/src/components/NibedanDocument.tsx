import { forwardRef } from 'react';
import NepaliDate from 'nepali-date-converter';
import type { Report } from '../types';
import { municipalityNp } from '../data/wards';

const NP_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const toNpDigits = (s: string) => s.replace(/\d/g, (d) => NP_DIGITS[Number(d)]);

/** Format a timestamp as a Bikram Sambat date in Devanagari numerals,
 * e.g. '२०८३/०३/१९'. Falls back to the English date if conversion fails. */
function bsDate(iso: string): string {
  const d = new Date(iso);
  try {
    const bs = new NepaliDate(d);
    const mm = String(bs.getMonth() + 1).padStart(2, '0');
    const dd = String(bs.getDate()).padStart(2, '0');
    return toNpDigits(`${bs.getYear()}/${mm}/${dd}`);
  } catch {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}

/**
 * A formal, print-ready layout of a report's nibedan. Rendered off-screen and
 * rasterized to PDF by lib/pdf.ts (so Devanagari renders correctly).
 *
 * Fixed A4-ish width (794px ≈ 210mm @ 96dpi).
 */
/**
 * Split a generated letter into [before-subject, subject-line, after-subject]
 * so the विषय/Subject line can be rendered centered, and drop any date line —
 * the letterhead already stamps the submission date, and older saved letters
 * may carry a placeholder like 'मिति: २०८१/[महिना]/[गते]'.
 */
function formatLetter(body: string): { before: string; subject: string | null; after: string } {
  const lines = body
    .replace(/\r/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n') // collapse runs of blank lines — they render as huge gaps
    // The signature block is consecutive lines: no blank line between
    // 'निवेदक,' / 'Yours faithfully,' and the name/address lines that follow.
    .replace(/(निवेदक\s*,?)\n+/g, '$1\n')
    .replace(/(yours faithfully\s*,?)\n+/gi, '$1\n')
    .split('\n')
    .filter((l) => !/^\s*(मिति|मितिः|Date)\s*[ः:]/.test(l.trim()));

  const subjectIdx = lines.findIndex((l) => /^\s*(विषय|Subject)\s*[ः:]/.test(l));
  if (subjectIdx === -1) {
    return { before: lines.join('\n').trim(), subject: null, after: '' };
  }
  return {
    before: lines.slice(0, subjectIdx).join('\n').trim(),
    subject: lines[subjectIdx].trim(),
    after: lines.slice(subjectIdx + 1).join('\n').trim(),
  };
}

const NibedanDocument = forwardRef<HTMLDivElement, { report: Report }>(({ report }, ref) => {
  // Prefer the Nepali nibedan; fall back to the English letter if that's all there is.
  const body = report.nibedan || report.english_letter || '';
  const isNepali = !!report.nibedan;
  const letter = formatLetter(body);

  const submitted = report.created_at ? bsDate(report.created_at) : '—';

  return (
    <div
      ref={ref}
      style={{ width: 794 }}
      // text-left: the document is mounted off-screen inside arbitrary pages
      // (e.g. the centered success screen) and must not inherit their text-align.
      className="bg-white px-14 py-12 text-left text-slate-900"
    >
      {/* Letterhead — official नेपाल सरकार style */}
      <div className="relative pb-4" style={{ borderBottom: '3px double #1a365d' }}>
        <img
          src="/nepal-emblem.svg"
          alt="Government of Nepal emblem"
          className="absolute left-0 top-0 h-16 w-16 object-contain"
        />
        <img
          src="/nepal-flag.svg"
          alt="Flag of Nepal"
          className="absolute right-0 top-0 h-16 w-auto object-contain"
        />
        <div className="px-20 text-center">
          <p className="np text-xl font-bold leading-tight text-[#1a365d]">नेपाल सरकार</p>
          <p className="np text-lg font-bold leading-tight text-[#1a365d]">
            {municipalityNp(report.municipality)}
          </p>
          <p className="np text-sm font-semibold text-slate-600">
            वडा नं. {report.ward ?? '—'} को कार्यालय
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
            Office of the Ward {report.ward ?? '—'} · Citizen Complaint
          </p>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="font-mono font-semibold text-slate-700">
          {report.tracking_id || '—'}
        </span>
        <span className="np text-slate-600">मिति: {submitted}</span>
      </div>

      {/* Title */}
      <h1 className={`mt-6 text-center text-2xl font-bold underline ${isNepali ? 'np' : ''}`}>
        {isNepali ? 'निवेदन' : 'Complaint Letter'}
      </h1>

      {/* Body */}
      {body ? (
        <>
          {letter.before && (
            <pre
              className={`mt-6 whitespace-pre-wrap text-[15px] text-slate-800 ${
                isNepali ? 'np-body' : 'font-sans'
              }`}
              style={{ lineHeight: 1.7 }}
            >
              {letter.before}
            </pre>
          )}
          {letter.subject && (
            <p
              className={`mt-5 text-center text-[15px] font-semibold text-slate-800 ${
                isNepali ? 'np-body' : 'font-sans'
              }`}
            >
              {letter.subject}
            </p>
          )}
          {letter.after && (
            <pre
              className={`mt-5 whitespace-pre-wrap text-[15px] text-slate-800 ${
                isNepali ? 'np-body' : 'font-sans'
              }`}
              style={{ lineHeight: 1.7 }}
            >
              {letter.after}
            </pre>
          )}
        </>
      ) : (
        <div className="np mt-6 space-y-2 text-[15px] leading-relaxed text-slate-800">
          <p>श्रीमान् वडा अध्यक्षज्यू,</p>
          <p>
            वडा नं. {report.ward ?? '—'}, {report.municipality || 'नगरपालिका'}
          </p>
          <p>
            विषय: {report.category} सम्बन्धी समस्या ({report.location || '—'})।
          </p>
          <p>{report.description_np || report.description_en || ''}</p>
        </div>
      )}

      {/* Signature */}
      <div className="mt-12 flex justify-end">
        <div className="text-center">
          <div className="h-10 w-56 border-b border-slate-500" />
          <p className="np mt-1 text-sm text-slate-600">हस्ताक्षर / Signature</p>
          {report.reporter_name && (
            <p className="np text-sm font-semibold text-slate-800">{report.reporter_name}</p>
          )}
        </div>
      </div>

      <p className="mt-10 text-center text-[11px] text-slate-400">
        Generated via Hamro Ward · हाम्रो वडा
      </p>
    </div>
  );
});

NibedanDocument.displayName = 'NibedanDocument';

export default NibedanDocument;
