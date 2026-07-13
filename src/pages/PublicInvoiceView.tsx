import { useRef } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useTheme } from "@/hooks/useTheme";
import { useBranding } from "@/hooks/useBranding";
import { useEffectiveInvoiceLayout } from "@/hooks/useInvoiceLayout";
import { ThemedInvoiceDocument } from "@/components/invoice/ThemedInvoiceDocument";
import { InvoiceA4Preview } from "@/components/invoice/InvoiceA4Preview";
import { renderAndDownloadInvoicePdf } from "@/lib/renderAndDownloadInvoicePdf";
import { printInvoiceFromNode } from "@/lib/printInvoice";
import { defaultTheme } from "@/types/theme";

export default function PublicInvoiceView() {
  const { id } = useParams();
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch invoice without auth requirement
  const { data: invoice, isLoading: invoiceLoading, error: invoiceError } = useQuery({
    queryKey: ["public-invoice", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await api.get(`/public/invoices/${id}`);
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!id,
  });

  // Fetch company
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["public-company", invoice?.company_id],
    queryFn: async () => {
      if (!invoice?.company_id) return null;
      const { data, error } = await api.get(`/public/companies/${invoice.company_id}`);
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!invoice?.company_id,
  });

  // Fetch theme
  const { data: theme, isLoading: themeLoading } = useTheme();

  // Fetch branding
  const { data: branding, isLoading: brandingLoading } = useBranding();
  const { layout: invoiceLayout } = useEffectiveInvoiceLayout(invoice?.company_id);

  const isLoading = invoiceLoading || companyLoading || themeLoading || brandingLoading;
  const activeTheme = theme || defaultTheme;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice || invoiceError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Invoice not found
          </h2>
          <p className="text-muted-foreground">
            This invoice may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  const items = (invoice.items || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    amount: Number(item.amount),
    qty: item.qty || 1,
    unit_price: item.unit_price || Number(item.amount),
  }));

  const installments = (invoice.installments || []).map((inst: any) => ({
    id: inst.id,
    amount: Number(inst.amount),
    paid_date: inst.paid_date,
    payment_method: inst.payment_method || "Bank Transfer",
  }));

  const invoiceData = {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    client_name: invoice.client_name,
    client_email: invoice.client_email,
    client_phone: invoice.client_phone,
    client_address: invoice.client_address,
    invoice_date: invoice.invoice_date,
    status: invoice.status,
    subtotal: Number(invoice.subtotal) || 0,
    vat_amount: Number(invoice.vat_amount) || 0,
    total_amount: Number(invoice.total_amount),
    paid_amount: Number(invoice.paid_amount),
    due_amount: Number(invoice.due_amount),
    notes: invoice.notes,
  };

  const companyData = company ? {
    name: company.name,
    tagline: company.tagline,
    logo_url: company.logo_url,
    email: company.email,
    phone: company.phone,
    address: company.address,
    address_line1: company.address_line1,
    address_line2: company.address_line2,
    website: company.website,
    thank_you_text: company.thank_you_text,
    show_qr_code: company.show_qr_code,
    footer_alignment: company.footer_alignment,
  } : null;

  const handleDownloadPdf = async () => {
    await renderAndDownloadInvoicePdf({
      invoice: invoiceData,
      items,
      installments,
      company: companyData,
      theme: activeTheme,
      branding,
      layout: invoiceLayout,
      filename: `${invoice.invoice_number}.pdf`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* Action Buttons - Hidden on Print */}
      <div className="max-w-4xl mx-auto mb-4 flex flex-wrap justify-end gap-2 print:hidden sm:mb-6 sm:gap-3">
        <Button variant="outline" size="sm" className="sm:size-default" onClick={handleDownloadPdf}>
          <FileDown className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="sm:size-default"
          onClick={() => printRef.current && printInvoiceFromNode(printRef.current)}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      <div className="mx-auto w-full max-w-4xl">
        <InvoiceA4Preview
          invoice={invoiceData}
          items={items}
          installments={installments}
          company={companyData}
          theme={activeTheme}
          branding={branding}
          layout={invoiceLayout}
        />
      </div>

      <div className="absolute -left-[10000px] top-0 w-[210mm] overflow-hidden" aria-hidden>
        <div ref={printRef} className="invoice-print-area bg-white">
          <ThemedInvoiceDocument
            invoice={invoiceData}
            items={items}
            installments={installments}
            company={companyData}
            theme={activeTheme}
            branding={branding}
            layout={invoiceLayout}
          />
        </div>
      </div>

      {/* Branding Footer */}
      <div className="max-w-4xl mx-auto mt-6 text-center text-xs text-muted-foreground print:hidden">
        Powered by S M Invoice Software
      </div>
    </div>
  );
}
