/**
 * Render an on-page (but visually hidden) element to an A4 PDF. Content up to
 * ~1.5 pages tall is scaled down to fit a single page (a nibedan should arrive
 * as one sheet); anything longer falls back to multi-page.
 *
 * We rasterize the element with html2canvas rather than writing text directly,
 * because jsPDF's built-in fonts can't render Devanagari (Nepali). Capturing the
 * DOM preserves the नेपाली text exactly as the browser draws it.
 *
 * jsPDF + html2canvas are heavy (~1 MB), so they're dynamically imported here
 * and only loaded the first time a user actually downloads a PDF.
 */
export async function elementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const pdf = await renderPdf(element);
  pdf.save(filename);
}

/** Render the element to a PDF and open it in a new tab with the print
 * dialog triggered — the "Print complaint" path. */
export async function elementToPdfPrint(element: HTMLElement): Promise<void> {
  const pdf = await renderPdf(element);
  pdf.autoPrint();
  window.open(pdf.output('bloburl'), '_blank');
}

async function renderPdf(element: HTMLElement) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  // Make sure the Devanagari web font is loaded before capturing.
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgData = canvas.toDataURL('image/png');
  const fullWidthHeight = (canvas.height * pageWidth) / canvas.width;

  if (fullWidthHeight <= pageHeight * 1.5) {
    // The letter is at most ~1.5 pages at full width: shrink it (preserving
    // aspect ratio) so the whole nibedan sits on ONE page, like the preview.
    // Splitting it would cut the letter mid-row at the page break.
    const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    pdf.addImage(imgData, 'PNG', (pageWidth - w) / 2, (pageHeight - h) / 2, w, h);
  } else {
    // Genuinely long content: paginate at full width.
    let heightLeft = fullWidthHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, fullWidthHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, fullWidthHeight);
      heightLeft -= pageHeight;
    }
  }

  return pdf;
}
