import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Full A4 page size in millimeters; document padding provides page margins.
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_BREAK_SAFETY_MM = 1.5;
const PDF_CAPTURE_SCALE = 2;

/**
 * Find safe Y positions (in px) where the page can be split without cutting
 * elements (rows, footer block, headings, images, etc.) in half.
 */
const getBreakpointsFromDom = (element: HTMLElement): number[] => {
  const rootRect = element.getBoundingClientRect();
  const selectors = [
    "tbody tr",
    "[data-pdf-footer]",
    "img",
    "h1, h2, h3, h4, h5, h6",
    "p",
    "table",
    "thead",
    "tbody",
    "section",
    "article",
    "div",
  ];

  // Atomic blocks that must NEVER be split across pages. We collect their
  // [top, bottom] ranges and exclude any breakpoint candidate strictly
  // inside them â€” the only valid splits are at their top or bottom edges.
  const atomicNodes = element.querySelectorAll<HTMLElement>(
    "[data-pdf-footer], .invoice-keep-together"
  );
  const atomicRanges: Array<[number, number]> = [];
  atomicNodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.height <= 0) return;
    const top = rect.top - rootRect.top;
    const bottom = rect.bottom - rootRect.top;
    atomicRanges.push([top, bottom]);
  });

  const isInsideAtomic = (pos: number) =>
    atomicRanges.some(([top, bottom]) => pos > top + 0.5 && pos < bottom - 0.5);

  const positions = new Set<number>([0]);

  // Prefer table row boundaries for clean multi-page splits.
  const rowNodes = element.querySelectorAll<HTMLElement>("tbody tr.invoice-row");
  if (rowNodes.length > 0) {
    rowNodes.forEach((row) => {
      const rect = row.getBoundingClientRect();
      const bottom = rect.bottom - rootRect.top;
      if (rect.height > 0) {
        positions.add(Math.max(0, Math.round(bottom)));
      }
    });
    return Array.from(positions).sort((a, b) => a - b);
  }

  const nodes = element.querySelectorAll<HTMLElement>(selectors.join(", "));

  nodes.forEach((node) => {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return;

    const rect = node.getBoundingClientRect();
    const top = rect.top - rootRect.top;
    const bottom = rect.bottom - rootRect.top;
    if (rect.height <= 0) return;

    const topPx = Math.max(0, Math.round(top));
    const bottomPx = Math.max(0, Math.round(bottom));

    if (!isInsideAtomic(topPx)) positions.add(topPx);
    if (!isInsideAtomic(bottomPx)) positions.add(bottomPx);
  });

  return Array.from(positions).sort((a, b) => a - b);
};

const chooseSliceHeightPx = (
  sourceY: number,
  maxSliceHeightPx: number,
  totalHeightPx: number,
  breakpointsPx: number[],
  minSliceHeightPx: number
) => {
  const remaining = totalHeightPx - sourceY;
  if (remaining <= maxSliceHeightPx) return remaining;

  const maxTarget = sourceY + maxSliceHeightPx;
  const minTarget = sourceY + minSliceHeightPx;

  let bestBreakpoint: number | null = null;
  for (const point of breakpointsPx) {
    if (point <= minTarget) continue;
    if (point > maxTarget) break;
    bestBreakpoint = point;
  }

  if (bestBreakpoint && bestBreakpoint > sourceY) {
    return bestBreakpoint - sourceY;
  }

  return maxSliceHeightPx;
};

/**
 * Capture an element as a multi-page A4 PDF that mirrors the on-screen /
 * print layout exactly. The footer flows naturally after the table, just
 * like in browser print â€” no special bottom pinning.
 */
export async function generateInvoicePdfFromDom(
  element: HTMLElement,
  filename: string,
  options: { output?: "save" | "blob" } = {}
): Promise<Blob | void> {
  const output = options.output ?? "save";
  const canvas = await html2canvas(element, {
    scale: PDF_CAPTURE_SCALE,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: element.scrollWidth,
    onclone: (_doc, clonedElement) => {
      clonedElement.querySelectorAll<HTMLElement>(".invoice-pill-badge").forEach((badge) => {
        badge.style.display = "inline-block";
        badge.style.textAlign = "center";
        badge.style.verticalAlign = "middle";
        badge.style.paddingTop = "0";
        badge.style.paddingBottom = "0";
        const size = badge.classList.contains("invoice-pill-badge--sm") ? 18 : 22;
        badge.style.height = `${size}px`;
        badge.style.lineHeight = `${size}px`;
        badge.style.borderRadius = `${size / 2}px`;
      });
    },
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const pageWidthMm = pdfWidth || A4_WIDTH_MM;
  const pageHeightMm = pdfHeight || A4_HEIGHT_MM;
  const usablePageHeightMm = pageHeightMm - PAGE_BREAK_SAFETY_MM;

  const pixelsPerMm = canvas.width / pageWidthMm;
  const totalHeightMm = canvas.height / pixelsPerMm;

  // Single page case
  if (totalHeightMm <= pageHeightMm + 2) {
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.98),
      "JPEG",
      0,
      0,
      pageWidthMm,
      Math.min(totalHeightMm, pageHeightMm),
      undefined,
      "FAST"
    );
    if (output === "blob") return pdf.output("blob");
    pdf.save(filename);
    return;
  }

  // Multi-page: slice respecting natural element boundaries
  const breakpointsPx = getBreakpointsFromDom(element).map(
    (point) => point * PDF_CAPTURE_SCALE
  );
  const pageHeightPx = Math.floor(usablePageHeightMm * pixelsPerMm);
  const minSliceHeightPx = Math.floor(Math.max(25, 18 * pixelsPerMm));

  let sourceY = 0;
  let isFirst = true;

  while (sourceY < canvas.height) {
    const sliceHeightPx = chooseSliceHeightPx(
      sourceY,
      pageHeightPx,
      canvas.height,
      breakpointsPx,
      minSliceHeightPx
    );

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      pageCanvas.width,
      pageCanvas.height
    );

    if (!isFirst) pdf.addPage();
    pdf.addImage(
      pageCanvas.toDataURL("image/jpeg", 0.98),
      "JPEG",
      0,
      0,
      pageWidthMm,
      sliceHeightPx / pixelsPerMm,
      undefined,
      "FAST"
    );

    sourceY += sliceHeightPx;
    isFirst = false;
  }

  if (output === "blob") return pdf.output("blob");
  pdf.save(filename);
}
