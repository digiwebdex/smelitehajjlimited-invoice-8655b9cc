import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Printer,
  Copy,
  Mail,
  MessageCircle,
  Loader2,
  FileDown,
  PenLine,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInvoice } from "@/hooks/useInvoices";
import { useCompany } from "@/hooks/useCompanies";
import { useTheme } from "@/hooks/useTheme";
import { useBranding } from "@/hooks/useBranding";
import { useEffectiveInvoiceLayout } from "@/hooks/useInvoiceLayout";
import { useToast } from "@/hooks/use-toast";
import { ThemedInvoiceDocument } from "@/components/invoice/ThemedInvoiceDocument";
import { InvoiceA4Preview } from "@/components/invoice/InvoiceA4Preview";
import { renderAndDownloadInvoicePdf } from "@/lib/renderAndDownloadInvoicePdf";
import { printInvoiceFromNode } from "@/lib/printInvoice";
import { QuickEditSheet } from "@/components/invoice/QuickEditSheet";
import { defaultTheme } from "@/types/theme";

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: invoice, isLoading: invoiceLoading } = useInvoice(id);
  const { data: company, isLoading: companyLoading } = useCompany(invoice?.company_id);
  const { data: theme, isLoading: themeLoading } = useTheme();
  const { data: branding, isLoading: brandingLoading } = useBranding();
  const { layout: invoiceLayout } = useEffectiveInvoiceLayout(invoice?.company_id);

  const isLoading = invoiceLoading || companyLoading || themeLoading || brandingLoading;
  const activeTheme = theme || defaultTheme;

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "paid":
        return { backgroundColor: activeTheme.badge_paid_color, color: "#ffffff" };
      case "partial":
        return { backgroundColor: activeTheme.badge_partial_color, color: "#ffffff" };
      case "unpaid":
      default:
        return { backgroundColor: activeTheme.badge_unpaid_color, color: "#ffffff" };
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground">Invoice not found</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/invoices")}>
            Back to Invoices
          </Button>
        </div>
      </AppLayout>
    );
  }

  const items = (invoice.items || []).map((item) => ({
    id: item.id,
    title: item.title,
    amount: Number(item.amount),
    qty: item.qty || 1,
    unit_price: item.unit_price || Number(item.amount),
  }));

  const installments = (invoice.installments || []).map((inst) => ({
    id: inst.id,
    amount: Number(inst.amount),
    paid_date: inst.paid_date,
    payment_method: (inst as any).payment_method || "Bank Transfer",
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

  const companyData = company
    ? {
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
      }
    : null;

  const documentProps = {
    invoice: invoiceData,
    items,
    installments,
    company: companyData,
    theme: activeTheme,
    branding,
    layout: invoiceLayout,
  };

  const handleDownloadPdf = async () => {
    await renderAndDownloadInvoicePdf({
      ...documentProps,
      filename: `${invoice.invoice_number}.pdf`,
    });
    toast({
      title: "PDF Downloaded",
      description: `Invoice ${invoice.invoice_number} has been downloaded.`,
    });
  };

  const publicUrl = `${window.location.origin}/view/${id}`;

  return (
    <AppLayout>
      <div className="print:bg-white print:min-h-0">
        <div className="mb-4 flex flex-col gap-3 print:hidden sm:mb-6">
          <div className="flex items-start gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 mt-0.5"
              onClick={() => navigate("/invoices")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground sm:text-2xl truncate">
                  {invoice.invoice_number}
                </h1>
                <span
                  className="px-2.5 py-0.5 text-xs font-medium rounded-full capitalize shrink-0 sm:text-sm sm:px-3 sm:py-1"
                  style={getStatusBadgeStyle(invoice.status)}
                >
                  {invoice.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Invoice Preview</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="sm:size-default" onClick={handleDownloadPdf}>
              <FileDown className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="sm:size-default"
              onClick={() => printRef.current && printInvoiceFromNode(printRef.current)}
            >
              <Printer className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground sm:size-default"
              onClick={() => navigate(`/invoices/${id}/edit`)}
            >
              <Pencil className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="sm:size-default">
                  <MoreHorizontal className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate(`/invoices/${id}/preview`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Compare Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQuickEditOpen(true)}>
                  <PenLine className="h-4 w-4 mr-2" />
                  Quick Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    toast({ title: "Link copied", description: "Invoice link copied to clipboard." });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const companyName = branding?.company_name || company?.name || "Our Company";
                    const thankYou = branding?.thank_you_text || "Thank you for your business!";
                    const message = encodeURIComponent(
                      `${companyName}\n\nInvoice ${invoice.invoice_number} - ${invoice.client_name}\nTotal: ৳${invoice.total_amount}\nDue: ৳${invoice.due_amount}\n\nView: ${publicUrl}\n\n${thankYou}`
                    );
                    window.open(`https://wa.me/?text=${message}`, "_blank");
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Share via WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const companyName = branding?.company_name || company?.name || "Our Company";
                    const thankYou = branding?.thank_you_text || "Thank you for your business!";
                    const contactInfo = [branding?.email, branding?.phone].filter(Boolean).join(" | ");
                    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number} - ${companyName}`);
                    const body = encodeURIComponent(
                      `Dear ${invoice.client_name},\n\nPlease find the invoice details below:\n\nInvoice #: ${invoice.invoice_number}\nTotal Amount: ৳${invoice.total_amount}\nPaid: ৳${invoice.paid_amount}\nDue: ৳${invoice.due_amount}\n\nView Invoice: ${publicUrl}\n\n${thankYou}\n\n${companyName}\n${contactInfo}`
                    );
                    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Share via Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl">
          <InvoiceA4Preview {...documentProps} />
        </div>

        {/* True A4 host for browser print — not scaled */}
        <div className="absolute -left-[10000px] top-0 w-[210mm] overflow-hidden" aria-hidden>
          <div ref={printRef} className="invoice-print-area bg-white">
            <ThemedInvoiceDocument {...documentProps} />
          </div>
        </div>

        <QuickEditSheet open={quickEditOpen} onOpenChange={setQuickEditOpen} invoice={invoice} />
      </div>
    </AppLayout>
  );
}
