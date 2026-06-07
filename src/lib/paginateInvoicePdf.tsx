import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { createRoot } from "react-dom/client";
import {
  ThemedInvoiceDocument,
  type InvoicePageSlice,
} from "@/components/invoice/ThemedInvoiceDocument";
import { ThemeSettings } from "@/types/theme";
import { BrandSettings } from "@/types/branding";
import { InvoiceLayout } from "@/types/invoiceLayout";

const PDF_SCALE = 2;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export interface InvoicePdfRenderArgs {
  invoice: any;
  items: any[];
  installments: any[];
  company: any;
  theme: ThemeSettings;
  branding: BrandSettings | null | undefined;
  layout?: InvoiceLayout;
}

interface PagePlan {
  items: any[];
  pageSlice: InvoicePageSlice;
  pageLabel?: string;
}

interface LayoutMeasurements {
  docPadding: number;
  header: number;
  billTo: number;
  thead: number;
  rowHeights: number[];
  summary: number;
  inWords: number;
  notes: number;
  paymentHistory: number;
  footer: number;
  totalHeight: number;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const getPageHeightPx = (): number => {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:-9999px;height:297mm;width:210mm;";
  document.body.appendChild(probe);
  const height = probe.offsetHeight;
  document.body.removeChild(probe);
  return height;
};

const measureHeight = (root: HTMLElement, selector: string): number => {
  const element = root.querySelector(selector) as HTMLElement | null;
  return element?.offsetHeight ?? 0;
};

const measureLayout = (root: HTMLElement): LayoutMeasurements => {
  const documentEl = root.querySelector(".invoice-document") as HTMLElement | null;
  const style = documentEl ? window.getComputedStyle(documentEl) : null;
  const padding =
    (parseFloat(style?.paddingTop || "0") || 0) +
    (parseFloat(style?.paddingBottom || "0") || 0);

  const rowHeights = Array.from(
    root.querySelectorAll<HTMLElement>(".invoice-row")
  ).map((row) => row.offsetHeight);

  return {
    docPadding: padding,
    header: measureHeight(root, ".invoice-print-header"),
    billTo: measureHeight(root, ".invoice-print-billto"),
    thead: measureHeight(root, ".invoice-items thead"),
    rowHeights,
    summary: measureHeight(root, ".invoice-print-summary"),
    inWords: measureHeight(root, ".invoice-print-inwords"),
    notes: measureHeight(root, ".invoice-print-notes"),
    paymentHistory: measureHeight(root, ".invoice-print-payment-history"),
    footer: measureHeight(root, ".invoice-print-footer"),
    totalHeight: documentEl?.offsetHeight ?? 0,
  };
};

const buildPagePlans = (
  allItems: any[],
  measurements: LayoutMeasurements,
  pageHeightPx: number
): PagePlan[] => {
  if (allItems.length === 0) {
    return [
      {
        items: [],
        pageSlice: {
          showHeader: true,
          showBillTo: true,
          showSummary: true,
          showInWords: true,
          showNotes: true,
          showPaymentHistory: true,
          showFooter: true,
        },
      },
    ];
  }

  const tailHeight =
    measurements.summary +
    measurements.inWords +
    measurements.notes +
    measurements.paymentHistory +
    measurements.footer;

  const plans: PagePlan[] = [];
  let rowIndex = 0;
  let pageNumber = 0;

  while (rowIndex < allItems.length) {
    let budget = pageHeightPx - measurements.docPadding - measurements.thead;
    if (pageNumber === 0) {
      budget -= measurements.header + measurements.billTo;
    }

    const remainingHeights = measurements.rowHeights.slice(rowIndex);
    const remainingRowsHeight = sum(remainingHeights);
    const fitsWithTail = remainingRowsHeight + tailHeight <= budget;

    if (fitsWithTail) {
      plans.push({
        items: allItems.slice(rowIndex),
        pageSlice: {
          showHeader: pageNumber === 0,
          showBillTo: pageNumber === 0,
          showSummary: true,
          showInWords: true,
          showNotes: true,
          showPaymentHistory: true,
          showFooter: true,
        },
        pageLabel: pageNumber > 0 ? `Page ${pageNumber + 1}` : undefined,
      });
      break;
    }

    const pageItems: any[] = [];
    let usedHeight = 0;

    while (rowIndex < allItems.length) {
      const rowHeight = measurements.rowHeights[rowIndex] ?? 0;
      if (pageItems.length > 0 && usedHeight + rowHeight > budget) {
        break;
      }
      pageItems.push(allItems[rowIndex]);
      usedHeight += rowHeight;
      rowIndex++;
    }

    if (pageItems.length === 0 && rowIndex < allItems.length) {
      pageItems.push(allItems[rowIndex]);
      rowIndex++;
    }

    plans.push({
      items: pageItems,
      pageSlice: {
        showHeader: pageNumber === 0,
        showBillTo: pageNumber === 0,
        showSummary: false,
        showInWords: false,
        showNotes: false,
        showPaymentHistory: false,
        showFooter: false,
      },
      pageLabel: pageNumber > 0 ? `Page ${pageNumber + 1}` : undefined,
    });

    pageNumber++;
  }

  const lastPlan = plans[plans.length - 1];
  if (lastPlan && !lastPlan.pageSlice.showFooter) {
    plans.push({
      items: [],
      pageSlice: {
        showHeader: false,
        showBillTo: false,
        showSummary: true,
        showInWords: true,
        showNotes: true,
        showPaymentHistory: true,
        showFooter: true,
      },
      pageLabel: `Page ${plans.length + 1}`,
    });
  }

  return plans;
};

const waitForRender = async () => {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await new Promise((resolve) => setTimeout(resolve, 300));
};

const applyPdfCloneFixes = (clonedElement: HTMLElement) => {
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
};

const capturePageCanvas = async (element: HTMLElement) =>
  html2canvas(element, {
    scale: PDF_SCALE,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    width: element.offsetWidth,
    height: element.offsetHeight,
    windowWidth: element.offsetWidth,
    onclone: (_doc, clonedElement) => applyPdfCloneFixes(clonedElement),
  });

const createPdfHost = () => {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "210mm";
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  document.body.appendChild(host);
  return host;
};

const renderInvoicePage = (
  host: HTMLElement,
  args: InvoicePdfRenderArgs,
  plan: PagePlan
) => {
  const root = createRoot(host);
  root.render(
    <div
      className="invoice-pdf-page"
      style={{
        width: "210mm",
        minHeight: "297mm",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      <ThemedInvoiceDocument
        invoice={args.invoice}
        items={plan.items}
        installments={args.installments}
        company={args.company}
        theme={args.theme}
        branding={args.branding}
        layout={args.layout}
        pdfMode
        pageSlice={plan.pageSlice}
        pageLabel={plan.pageLabel}
      />
    </div>
  );
  return root;
};

export async function generatePaginatedInvoicePdf(
  args: InvoicePdfRenderArgs,
  filename: string,
  options: { output?: "save" | "blob" } = {}
): Promise<Blob | void> {
  const output = options.output ?? "save";
  const measureHost = createPdfHost();
  const measureRoot = renderInvoicePage(measureHost, args, {
    items: args.items,
    pageSlice: {
      showHeader: true,
      showBillTo: true,
      showSummary: true,
      showInWords: true,
      showNotes: true,
      showPaymentHistory: true,
      showFooter: true,
    },
  });

  await waitForRender();

  const pageHeightPx = getPageHeightPx();
  const measurements = measureLayout(measureHost);
  const singlePage = measurements.totalHeight <= pageHeightPx + 4;

  measureRoot.unmount();
  document.body.removeChild(measureHost);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const plans = singlePage
    ? [
        {
          items: args.items,
          pageSlice: {
            showHeader: true,
            showBillTo: true,
            showSummary: true,
            showInWords: true,
            showNotes: true,
            showPaymentHistory: true,
            showFooter: true,
          },
        },
      ]
    : buildPagePlans(args.items, measurements, pageHeightPx);

  for (let index = 0; index < plans.length; index++) {
    const host = createPdfHost();
    const root = renderInvoicePage(host, args, plans[index]);
    await waitForRender();

    const pageElement = host.firstElementChild as HTMLElement;
    const canvas = await capturePageCanvas(pageElement);

    if (index > 0) {
      pdf.addPage();
    }

    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.98),
      "JPEG",
      0,
      0,
      A4_WIDTH_MM,
      A4_HEIGHT_MM,
      undefined,
      "FAST"
    );

    root.unmount();
    document.body.removeChild(host);
  }

  if (output === "blob") {
    return pdf.output("blob");
  }

  pdf.save(filename);
}
