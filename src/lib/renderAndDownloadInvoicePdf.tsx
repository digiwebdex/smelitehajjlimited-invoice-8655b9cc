import { generatePaginatedInvoicePdf } from "@/lib/paginateInvoicePdf";
import { ThemeSettings } from "@/types/theme";
import { BrandSettings } from "@/types/branding";
import { InvoiceLayout } from "@/types/invoiceLayout";

interface RenderArgs {
  invoice: any;
  items: any[];
  installments: any[];
  company: any;
  theme: ThemeSettings;
  branding: BrandSettings | null | undefined;
  layout?: InvoiceLayout;
  filename: string;
}

export async function renderInvoicePdfBlob(
  args: Omit<RenderArgs, "filename">
): Promise<Blob> {
  const blob = await generatePaginatedInvoicePdf(args, "invoice.pdf", {
    output: "blob",
  });
  return blob as Blob;
}

/**
 * Render paginated invoice pages and download as a formatted multi-page A4 PDF.
 */
export async function renderAndDownloadInvoicePdf(args: RenderArgs): Promise<void> {
  await generatePaginatedInvoicePdf(args, args.filename, { output: "save" });
}
