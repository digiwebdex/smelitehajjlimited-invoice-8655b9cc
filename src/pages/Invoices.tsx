import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, FileText, Filter, Download, X, Eye, Pencil, CalendarIcon, FileSpreadsheet, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInvoices, Invoice, useInvoice, useDeleteInvoice } from "@/hooks/useInvoices";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCompanies, useCompany } from "@/hooks/useCompanies";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { useBranding } from "@/hooks/useBranding";
import { renderAndDownloadInvoicePdf } from "@/lib/renderAndDownloadInvoicePdf";
import { defaultTheme } from "@/types/theme";
import { api } from "@/lib/apiClient";

export default function Invoices() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: theme } = useTheme();
  const { data: branding } = useBranding();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const deleteInvoice = useDeleteInvoice();

  // Read company filter from URL query params
  useEffect(() => {
    const companyParam = searchParams.get("company");
    if (companyParam) {
      setCompanyFilter(companyParam);
    }
  }, [searchParams]);

  const isLoading = invoicesLoading || companiesLoading;

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || invoice.status === statusFilter;
    const matchesCompany =
      companyFilter === "all" || invoice.company_id === companyFilter;
    const invoiceDate = new Date(invoice.invoice_date);
    const matchesStartDate = !startDate || invoiceDate >= startDate;
    const matchesEndDate = !endDate || invoiceDate <= endDate;
    return matchesSearch && matchesStatus && matchesCompany && matchesStartDate && matchesEndDate;
  });

  // Download PDF for a specific invoice
  const handleDownloadPdf = async (invoiceId: string) => {
    setDownloadingId(invoiceId);
    try {
      const { data: invoiceData, error: invoiceError } = await api.get(`/invoices/${invoiceId}`);
      if (invoiceError || !invoiceData) throw new Error("Invoice not found");

      const itemsData = invoiceData.items || [];
      const installmentsData = invoiceData.installments || [];
      const { data: companyData } = await api.get(`/companies/${invoiceData.company_id}`);

      const items = itemsData.map((item: any) => ({
        id: item.id,
        title: item.title,
        amount: Number(item.amount),
        qty: item.qty || 1,
        unit_price: Number(item.unit_price) || Number(item.amount),
      }));

      const installments = installmentsData.map((inst: any) => ({
        id: inst.id,
        amount: Number(inst.amount),
        paid_date: inst.paid_date,
        payment_method: inst.payment_method || "Bank Transfer",
      }));

      const invoiceDoc = {
        id: invoiceData.id,
        invoice_number: invoiceData.invoice_number,
        client_name: invoiceData.client_name,
        client_email: invoiceData.client_email,
        client_phone: invoiceData.client_phone,
        client_address: invoiceData.client_address,
        invoice_date: invoiceData.invoice_date,
        status: invoiceData.status,
        subtotal: Number(invoiceData.subtotal) || 0,
        vat_amount: Number(invoiceData.vat_amount) || 0,
        total_amount: Number(invoiceData.total_amount),
        paid_amount: Number(invoiceData.paid_amount),
        due_amount: Number(invoiceData.due_amount),
        notes: invoiceData.notes,
      };

      const companyDoc = companyData ? {
        name: companyData.name,
        tagline: companyData.tagline,
        logo_url: companyData.logo_url,
        email: companyData.email,
        phone: companyData.phone,
        address: companyData.address,
        address_line1: companyData.address_line1,
        address_line2: companyData.address_line2,
        website: companyData.website,
        thank_you_text: companyData.thank_you_text,
        show_qr_code: companyData.show_qr_code,
        footer_alignment: companyData.footer_alignment,
      } : null;

      await renderAndDownloadInvoicePdf({
        invoice: invoiceDoc,
        items,
        installments,
        company: companyDoc,
        theme: theme || defaultTheme,
        branding,
        filename: `${invoiceData.invoice_number}.pdf`,
      });

      toast({
        title: "PDF Downloaded",
        description: `Invoice ${invoiceData.invoice_number} has been downloaded.`,
      });
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast({
        title: "Download Failed",
        description: "Could not generate the invoice PDF.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map((inv) => inv.id)));
    }
  };

  const formatCurrency = (amount: number) => {
    return `৳${new Intl.NumberFormat("en-BD", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    const styles = {
      paid: "status-paid",
      partial: "status-partial",
      unpaid: "status-unpaid",
    };
    return (
      <span
        className={cn(
          "px-2.5 py-0.5 text-xs font-medium rounded-full capitalize",
          styles[status]
        )}
      >
        {status}
      </span>
    );
  };

  const getCompanyName = (companyId: string) => {
    return companies.find((c) => c.id === companyId)?.name || "Unknown";
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

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Invoices
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all your invoices
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/invoices/new")}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* Batch Actions Bar */}
        {selectedInvoices.size > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {selectedInvoices.size} invoice{selectedInvoices.size > 1 ? "s" : ""} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedInvoices(new Set())}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <span className="text-sm text-muted-foreground">Date Range:</span>
            <div className="flex flex-wrap gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[150px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">—</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[150px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="card-elevated overflow-hidden">
          {/* Mobile Select All Header */}
          <div className="md:hidden flex items-center gap-3 p-4 border-b border-border bg-muted/30">
            <Checkbox
              checked={filteredInvoices.length > 0 && selectedInvoices.size === filteredInvoices.length}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all"
            />
            <span className="text-sm font-medium text-muted-foreground">
              Select all ({filteredInvoices.length})
            </span>
          </div>

          {/* Table Header (Desktop) */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 border-b border-border bg-muted/30 text-sm font-medium text-muted-foreground">
            <div className="col-span-1 flex items-center">
              <Checkbox
                checked={filteredInvoices.length > 0 && selectedInvoices.size === filteredInvoices.length}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </div>
            <div className="col-span-2">Invoice #</div>
            <div className="col-span-2">Company</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-1">Date</div>
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>

          {/* Invoice Rows */}
          <div className="divide-y divide-border">
            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground">
                  No invoices found
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" || companyFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first invoice to get started"}
                </p>
              </div>
            ) : (
              filteredInvoices.map((invoice, index) => (
                <div
                  key={invoice.id}
                  className={cn(
                    "p-4 hover:bg-muted/30 transition-colors",
                    selectedInvoices.has(invoice.id) && "bg-primary/5"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Desktop View */}
                  <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                    <div className="col-span-1 flex items-center">
                      <Checkbox
                        checked={selectedInvoices.has(invoice.id)}
                        onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                        aria-label={`Select ${invoice.invoice_number}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">
                          {invoice.invoice_number}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2 text-muted-foreground truncate">
                      {getCompanyName(invoice.company_id)}
                    </div>
                    <div className="col-span-2 text-muted-foreground truncate">
                      {invoice.client_name}
                    </div>
                    <div className="col-span-1 text-muted-foreground text-sm">
                      {formatDate(invoice.invoice_date)}
                    </div>
                    <div className="col-span-1 text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(Number(invoice.total_amount))}
                      </p>
                    </div>
                    <div className="col-span-1 text-center">
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="col-span-2 flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        title="View Invoice"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleDownloadPdf(invoice.id)}
                        disabled={downloadingId === invoice.id}
                        title="Download PDF"
                      >
                        {downloadingId === invoice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-accent"
                        onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                        title="Edit Invoice"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete Invoice"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <strong>{invoice.invoice_number}</strong>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteInvoice.mutate(invoice.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedInvoices.has(invoice.id)}
                          onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                          aria-label={`Select ${invoice.invoice_number}`}
                        />
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {invoice.invoice_number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getCompanyName(invoice.company_id)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="flex flex-col gap-2 pl-12 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-muted-foreground truncate">
                        {invoice.client_name} • {formatDate(invoice.invoice_date)}
                      </span>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <span className="font-semibold text-foreground">
                          {formatCurrency(Number(invoice.total_amount))}
                        </span>
                        <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          title="View Invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleDownloadPdf(invoice.id)}
                          disabled={downloadingId === invoice.id}
                          title="Download PDF"
                        >
                          {downloadingId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-accent"
                          onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                          title="Edit Invoice"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Delete Invoice"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{invoice.invoice_number}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteInvoice.mutate(invoice.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
