import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Printer, FileDown } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useInvoice } from "@/hooks/useInvoices";
import { useCompany } from "@/hooks/useCompanies";
import { useTheme } from "@/hooks/useTheme";
import { useBranding } from "@/hooks/useBranding";
import { ThemedInvoiceDocument } from "@/components/invoice/ThemedInvoiceDocument";
import { InvoiceA4Preview } from "@/components/invoice/InvoiceA4Preview";
import {
  renderAndDownloadInvoicePdf,
  renderInvoicePdfBlob,
} from "@/lib/renderAndDownloadInvoicePdf";
import { printInvoiceFromNode } from "@/lib/printInvoice";
import { defaultTheme } from "@/types/theme";

export default function InvoicePreviewCompare() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: invoice, isLoading: invoiceLoading } = useInvoice(id);
  const { data: company, isLoading: companyLoading } = useCompany(invoice?.company_id);
  const { data: theme, isLoading: themeLoading } = useTheme();
  const { data: branding, isLoading: brandingLoading } = useBranding();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const dataReady = invoice && !invoiceLoading && !companyLoading && !themeLoading && !brandingLoading;
  const activeTheme = theme || defaultTheme;

  const items = useMemo(
    () =>
      (invoice?.items || []).map((it: any) => ({
        id: it.id,
        title: it.title,
        amount: Number(it.amount),
        qty: it.qty || 1,
        unit_price: it.unit_price || Number(it.amount),
      })),
    [invoice]
  );

  const installments = useMemo(
    () =>
      (invoice?.installments || []).map((inst: any) => ({
        id: inst.id,
        amount: Number(inst.amount),
        paid_date: inst.paid_date,
        payment_method: inst.payment_method || "Bank Transfer",
      })),
    [invoice]
  );

  const invoiceData = useMemo(() => {
    if (!invoice) return null;
    return {
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
  }, [invoice]);

  const companyData = useMemo(() => {
    if (!company) return null;
    return {
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
    };
  }, [company]);

  useEffect(() => {
    if (!dataReady || !invoiceData) return;

    let cancelled = false;
    setPdfLoading(true);

    renderInvoicePdfBlob({
      invoice: invoiceData,
      items,
      installments,
      company: companyData,
      theme: activeTheme,
      branding,
    })
      .then((blob) => {
        if (cancelled) return;
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false);
      });

    return () => {
      cancelled = true;
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [dataReady, invoiceData, items, installments, companyData, activeTheme, branding]);

  if (!dataReady || !invoiceData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const handleDownload = () =>
    renderAndDownloadInvoicePdf({
      invoice: invoiceData,
      items,
      installments,
      company: companyData,
      theme: activeTheme,
      branding,
      filename: `${invoice!.invoice_number}.pdf`,
    });

  return (
    <AppLayout>
      <div className="min-h-screen">
        <div className="max-w-[1600px] mx-auto mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(`/invoices/${id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate sm:text-xl">{invoice!.invoice_number}</h1>
              <p className="text-sm text-muted-foreground">PDF vs Print — side-by-side preview</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="sm:size-default" onClick={handleDownload}>
              <FileDown className="h-4 w-4 mr-2" /> Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="sm:size-default"
              onClick={() => printRef.current && printInvoiceFromNode(printRef.current)}
            >
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col min-w-0">
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
              PDF Output
            </div>
            <div className="bg-white rounded-xl shadow-lg border overflow-hidden h-[70vh] sm:h-[80vh] flex items-center justify-center">
              {pdfLoading && (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Generating PDF…</span>
                </div>
              )}
              {!pdfLoading && pdfUrl && (
                <iframe
                  src={`${pdfUrl}#toolbar=1&view=FitH`}
                  title="Invoice PDF"
                  className="w-full h-full"
                />
              )}
              {!pdfLoading && !pdfUrl && (
                <p className="text-sm text-muted-foreground">PDF unavailable.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
              Browser Print Preview
            </div>
            <div className="bg-neutral-100 rounded-xl border h-[70vh] sm:h-[80vh] overflow-auto p-3 sm:p-4">
              <InvoiceA4Preview
                invoice={invoiceData}
                items={items}
                installments={installments}
                company={companyData}
                theme={activeTheme}
                branding={branding}
                pdfMode
              />
            </div>
          </div>
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
              pdfMode
            />
          </div>
        </div>

        <p className="max-w-[1600px] mx-auto text-xs text-muted-foreground mt-3 text-center px-2">
          Both panels use the same A4 template — left is the PDF blob, right is the scaled print-ready preview.
        </p>
      </div>
    </AppLayout>
  );
}
