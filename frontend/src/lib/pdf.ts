/**
 * Render an on-page (but visually hidden) element to a multi-page A4 PDF.
 *
 * We rasterize the element with html2canvas rather than writing text directly,
 * because jsPDF's built-in fonts can't render Devanagari (Nepali). Capturing the
 * DOM preserves the नेपाली text exactly as the browser draws it.
 *
 * jsPDF + html2canvas are heavy (~1 MB), so they're dynamically imported here
 * and only loaded the first time a user actually downloads a PDF.
 */
export async function elementToPdf(element: HTMLElement, filename: string): Promise<void> {
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

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/png');

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Add extra pages if the letter is taller than one A4 page.
  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
