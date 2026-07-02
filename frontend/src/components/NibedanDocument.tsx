import { forwardRef } from 'react';
import type { Report } from '../types';

/**
 * A formal, print-ready layout of a report's nibedan. Rendered off-screen and
 * rasterized to PDF by lib/pdf.ts (so Devanagari renders correctly).
 *
 * Fixed A4-ish width (794px ≈ 210mm @ 96dpi).
 */
const NibedanDocument = forwardRef<HTMLDivElement, { report: Report }>(({ report }, ref) => {
  // Prefer the Nepali nibedan; fall back to the English letter if that's all there is.
  const body = report.nibedan || report.english_letter || '';
  const isNepali = !!report.nibedan;

  const submitted = report.created_at
    ? new Date(report.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <div
      ref={ref}
      style={{ width: 794 }}
      className="bg-white px-14 py-12 text-slate-900"
    >
      {/* Letterhead */}
      <div className="border-b-2 border-slate-800 pb-3 text-center">
        <p className="np text-lg font-bold">{report.municipality || 'नगरपालिका'}</p>
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Office of the Ward {report.ward ?? '—'} · Citizen Complaint
        </p>
      </div>

      {/* Meta row */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="font-mono font-semibold text-slate-700">
          {report.tracking_id || '—'}
        </span>
        <span className="text-slate-600">
          <span className="np">मिति</span> / Submitted: {submitted}
        </span>
      </div>

      {/* Title */}
      <h1 className={`mt-6 text-center text-2xl font-bold underline ${isNepali ? 'np' : ''}`}>
        {isNepali ? 'निवेदन' : 'Complaint Letter'}
      </h1>

      {/* Body */}
      {body ? (
        <pre
          className={`mt-6 whitespace-pre-wrap text-[15px] text-slate-800 ${
            isNepali ? 'np-body' : 'font-sans leading-relaxed'
          }`}
        >
          {body}
        </pre>
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

      {/* Details table */}
      <table className="mt-8 w-full border-collapse text-sm">
        <tbody>
          <Row label="Category" value={report.category} />
          <Row label="Severity" value={report.severity || '—'} />
          <Row label="Ward" value={`Ward ${report.ward ?? '—'}`} />
          <Row label="Location / landmark" value={report.location || '—'} />
          {report.latitude != null && report.longitude != null && (
            <Row
              label="Coordinates"
              value={`${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`}
            />
          )}
          <Row label="Reporter" value={report.reporter_name || '—'} />
          <Row label="Contact" value={report.contact || '—'} />
          <Row label="Status" value={report.status} />
        </tbody>
      </table>

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-200">
      <td className="w-1/3 py-1.5 pr-3 font-medium text-slate-500">{label}</td>
      <td className="np py-1.5 text-slate-800">{value}</td>
    </tr>
  );
}

export default NibedanDocument;
