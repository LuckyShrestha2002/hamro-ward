import { useRef, useState } from 'react';
import NibedanDocument from './NibedanDocument';
import { elementToPdf } from '../lib/pdf';
import type { Report } from '../types';

/**
 * Renders a hidden, print-ready Nibedan document off-screen and a button that
 * rasterizes it to a downloadable PDF.
 */
export default function DownloadPdfButton({
  report,
  className,
}: {
  report: Report;
  className?: string;
}) {
  const docRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'busy' | 'done'>('idle');

  async function handleDownload() {
    if (!docRef.current) return;
    setStatus('busy');
    try {
      await elementToPdf(docRef.current, `nibedan-${report.tracking_id || 'report'}.pdf`);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('PDF generation failed', err);
      alert('Sorry, the PDF could not be generated. Please try again.');
      setStatus('idle');
    }
  }

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={status === 'busy'}
        className={
          className ||
          'inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
        }
      >
        {status === 'busy' && (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        )}
        {status === 'busy' ? 'Preparing…' : status === 'done' ? '✓ Downloaded' : '⬇ Download PDF'}
      </button>

      {/* Off-screen: present in the DOM (so it has layout) but not visible. */}
      <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
        <NibedanDocument ref={docRef} report={report} />
      </div>
    </>
  );
}
