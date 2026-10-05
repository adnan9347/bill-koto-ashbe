/*
 * ==========================================================
 *  pdf.js — turn the bill slip into a downloadable PDF
 * ----------------------------------------------------------
 *  How it works:
 *   1. app.js builds the slip as normal HTML (so Bangla letters
 *      are joined correctly by the browser itself).
 *   2. html2canvas takes a sharp "photo" of that slip.
 *   3. jsPDF places the photo on A4 pages and downloads it.
 *      Long slips are split between rows, never through a row.
 *
 *  The two libraries are big, so they are loaded from cdnjs
 *  ONLY when someone taps "Download" — not on page load.
 *  If they can't load (e.g. offline), app.js opens the print
 *  window instead, where "Save as PDF" does the same job.
 * ==========================================================
 */

const LIBS = {
  html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
};

const A4 = { w: 210, h: 297 };       // millimetres
const NEXT_PAGE_MARGIN = 12;          // top & bottom space (mm) on page 2 onwards

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadLibraries() {
  await Promise.all([
    window.html2canvas ? null : loadScript(LIBS.html2canvas),
    window.jspdf ? null : loadScript(LIBS.jspdf),
  ]);
  if (!window.html2canvas || !window.jspdf) throw new Error('PDF libraries missing');
}

/** Where we may cut between pages: the bottom of every row / block (in CSS px from the slip's top). */
function safeBreaks(el) {
  const top = el.getBoundingClientRect().top;
  return [...el.querySelectorAll('tr, [data-break]')]
    .map((node) => node.getBoundingClientRect().bottom - top)
    .sort((a, b) => a - b);
}

/** Split the slip height into page-sized pieces, cutting only at safe points. */
function planPages(totalHeight, cssPerMm, breaks) {
  const pages = [];
  let start = 0;
  while (start < totalHeight - 1) {
    const usableMm = pages.length === 0 ? A4.h : A4.h - NEXT_PAGE_MARGIN * 2;
    let end = start + usableMm * cssPerMm;
    if (end >= totalHeight) {
      end = totalHeight;
    } else {
      const fits = breaks.filter((b) => b > start + 60 && b <= end);
      if (fits.length) end = fits[fits.length - 1];
    }
    pages.push([start, end]);
    start = end;
  }
  return pages;
}

/** Make the PDF from the slip element and download it as `filename`. */
export async function downloadSlipPdf(el, filename) {
  await loadLibraries();
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  const widthCss = el.offsetWidth;
  const canvas = await window.html2canvas(el, {
    scale: 2,
    backgroundColor: '#FFFFFF',
    logging: false,
    useCORS: true,
    // The slip lives off-screen; tell the copy to draw it at the top-left.
    onclone: (doc) => {
      const copy = doc.getElementById(el.id);
      if (copy) { copy.style.left = '0'; copy.style.top = '0'; }
    },
  });

  const scale = canvas.width / widthCss;     // canvas pixels per CSS pixel
  const cssPerMm = widthCss / A4.w;
  const pages = planPages(el.offsetHeight, cssPerMm, safeBreaks(el));

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

  pages.forEach(([start, end], i) => {
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.ceil((end - start) * scale);
    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, Math.floor(start * scale), slice.width, slice.height, 0, 0, slice.width, slice.height);

    if (i > 0) pdf.addPage();
    const y = i === 0 ? 0 : NEXT_PAGE_MARGIN;
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, y, A4.w, (end - start) / cssPerMm);
  });

  pdf.save(filename);
}
