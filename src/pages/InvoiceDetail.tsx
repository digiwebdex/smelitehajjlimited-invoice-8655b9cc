import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useInvoice,
  useInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useNextInvoiceNumber,
} from "@/hooks/useInvoices";
import { useCompanies, useCompany } from "@/hooks/useCompanies";
import { useTheme } from "@/hooks/useTheme";
import { useBranding } from "@/hooks/useBranding";
import { useEffectiveInvoiceLayout } from "@/hooks/useInvoiceLayout";
import { useToast } from "@/hooks/use-toast";
import { defaultTheme } from "@/types/theme";

import {
  InvoiceA4Preview,
  PaymentCard,
  invoiceFormSchema,
  lineItemSchema,
  formatCurrency,
  type LocalItem,
  type LocalInstallment,
  type InvoiceStatus,
} from "@/components/invoice";

const TODAY = new Date().toISOString().split("T")[0];

function createEmptyItem(): LocalItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    qty: 1,
    unitPrice: 0,
    amount: 0,
  };
}

/** Parse any date-ish value into "YYYY-MM-DD" for <input type="date"> */
function toDateInputValue(value: unknown): string {
  if (!value) return "";
  const str = String(value);
  const match = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  } catch {
    // ignore
  }
  return "";
}

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id || id === "new";

  const { data: existingInvoice, isLoading: invoiceLoading } = useInvoice(
    isNew ? undefined : id
  );
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: allInvoices = [] } = useInvoices();
  const { data: nextInvoiceNumber } = useNextInvoiceNumber();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const pastClients = useMemo(() => {
    const seen = new Map<string, { key: string; name: string; email?: string; phone?: string; address?: string }>();
    for (const inv of allInvoices) {
      const key = `${(inv.client_name || "").trim().toLowerCase()}|${(inv.client_phone || "").trim()}`;
      if (!inv.client_name || seen.has(key)) continue;
      seen.set(key, {
        key,
        name: inv.client_name,
        email: inv.client_email || undefined,
        phone: inv.client_phone || undefined,
        address: inv.client_address || undefined,
      });
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allInvoices]);

  const [populated, setPopulated] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(isNew ? TODAY : "");
  const [vatRate, setVatRate] = useState(0);
  const [items, setItems] = useState<LocalItem[]>([createEmptyItem()]);
  const [installments, setInstallments] = useState<LocalInstallment[]>([]);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [statusOverride, setStatusOverride] = useState<InvoiceStatus | "auto">("auto");
  const [amountInWords, setAmountInWords] = useState("");

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + toNumber(it.qty, 1) * toNumber(it.unitPrice, 0), 0),
    [items]
  );
  const vatAmount = (subtotal * vatRate) / 100;
  const totalAmount = subtotal + vatAmount;
  const paidAmount = useMemo(
    () => installments.reduce((sum, inst) => sum + toNumber(inst.amount, 0), 0),
    [installments]
  );
  const dueAmount = totalAmount - paidAmount;
  const autoStatus: InvoiceStatus =
    paidAmount >= totalAmount && totalAmount > 0
      ? "paid"
      : paidAmount > 0
      ? "partial"
      : "unpaid";
  const status: InvoiceStatus = statusOverride === "auto" ? autoStatus : statusOverride;

  useEffect(() => {
    if (isNew && nextInvoiceNumber) setInvoiceNumber(nextInvoiceNumber);
  }, [isNew, nextInvoiceNumber]);

  useEffect(() => {
    setPopulated(false);
    setErrors({});
    setCompanyId("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientAddress("");
    setNotes("");
    setVatRate(0);
    setItems([createEmptyItem()]);
    setInstallments([]);
    setStatusOverride("auto");
    setAmountInWords("");

    if (isNew) {
      setInvoiceDate(TODAY);
      return;
    }

    setInvoiceNumber("");
    setInvoiceDate("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  useEffect(() => {
    if (!existingInvoice || populated || existingInvoice.id !== id) return;

    setInvoiceNumber(existingInvoice.invoice_number);
    setCompanyId(existingInvoice.company_id);
    setClientName(existingInvoice.client_name);
    setClientEmail(existingInvoice.client_email || "");
    setClientPhone(existingInvoice.client_phone || "");
    setClientAddress(existingInvoice.client_address || "");
    setNotes(existingInvoice.notes || "");
    setInvoiceDate(
      toDateInputValue(existingInvoice.invoice_date) ||
        toDateInputValue(existingInvoice.created_at) ||
        TODAY
    );
    setVatRate(toNumber(existingInvoice.vat_rate, 0));
    setStatusOverride(existingInvoice.status);

    setItems(
      existingInvoice.items?.length
        ? existingInvoice.items.map((it) => {
            const qty = toNumber(it.qty, 0);
            const unitPrice = toNumber(it.unit_price, 0);
            return {
              id: it.id,
              title: it.title,
              qty,
              unitPrice,
              amount: qty * unitPrice,
            };
          })
        : [createEmptyItem()]
    );

    if (existingInvoice.installments?.length) {
      setInstallments(
        existingInvoice.installments.map((inst) => ({
          id: inst.id,
          amount: toNumber(inst.amount, 0),
          paid_date: inst.paid_date,
          payment_method: inst.payment_method || "Bank Transfer",
        }))
      );
    }

    setPopulated(true);
  }, [existingInvoice, populated, id]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    const map: Record<string, (v: string) => void> = {
      invoiceNumber: setInvoiceNumber,
      companyId: setCompanyId,
      clientName: setClientName,
      clientEmail: setClientEmail,
      clientPhone: setClientPhone,
      clientAddress: setClientAddress,
      invoiceDate: setInvoiceDate,
      notes: setNotes,
    };
    map[field]?.(value);
    setErrors((e) => ({ ...e, [field]: undefined }));
  }, []);

  const handleAddItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()]);
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== itemId) : prev));
  }, []);

  const handleUpdateItem = useCallback(
    (itemId: string, field: keyof LocalItem, value: string | number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const updated = { ...item };

          if (field === "title") {
            updated.title = String(value);
          } else if (field === "qty") {
            updated.qty = Math.max(0, Math.trunc(toNumber(value, 0)));
          } else if (field === "unitPrice") {
            updated.unitPrice = Math.max(0, toNumber(value, 0));
          } else if (field === "amount") {
            updated.amount = Math.max(0, toNumber(value, 0));
            return updated;
          }

          updated.amount = updated.qty * updated.unitPrice;
          return updated;
        })
      );
    },
    []
  );

  const handleAddInstallment = useCallback(() => {
    setInstallments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        amount: 0,
        paid_date: TODAY,
        payment_method: "Bank Transfer",
      },
    ]);
  }, []);

  const handleRemoveInstallment = useCallback((instId: string) => {
    setInstallments((prev) => prev.filter((i) => i.id !== instId));
  }, []);

  const handleUpdateInstallment = useCallback(
    (instId: string, field: keyof LocalInstallment, value: string | number) => {
      setInstallments((prev) =>
        prev.map((inst) => {
          if (inst.id !== instId) return inst;
          if (field === "amount") {
            return { ...inst, amount: Math.max(0, toNumber(value, 0)) };
          }
          return { ...inst, [field]: value };
        })
      );
    },
    []
  );

  const handleSave = async () => {
    const newErrors: Record<string, string | undefined> = {};

    const formResult = invoiceFormSchema.safeParse({
      invoiceNumber,
      companyId,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      invoiceDate,
      vatRate,
      notes,
    });
    if (!formResult.success) {
      formResult.error.issues.forEach((issue) => {
        newErrors[issue.path[0] as string] = issue.message;
      });
    }

    items.forEach((item, idx) => {
      const normalized = {
        id: item.id,
        title: item.title,
        qty: toNumber(item.qty, 0),
        unitPrice: Math.max(0, toNumber(item.unitPrice, 0)),
        amount: toNumber(item.qty, 0) * Math.max(0, toNumber(item.unitPrice, 0)),
      };
      const res = lineItemSchema.safeParse(normalized);
      if (!res.success) {
        res.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          newErrors[`items.${idx}.${field}`] = issue.message;
        });
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: "Validation error",
        description: "Please fix the highlighted fields.",
        variant: "destructive",
      });
      return;
    }

    setErrors({});

    const payload = {
      company_id: companyId,
      invoice_number: invoiceNumber,
      client_name: clientName,
      client_email: clientEmail || undefined,
      client_phone: clientPhone || undefined,
      client_address: clientAddress || undefined,
      notes: notes || undefined,
      invoice_date: invoiceDate,
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      status,
      items: items
        .filter((i) => i.title.trim())
        .map((i) => ({
          title: i.title,
          qty: toNumber(i.qty, 0),
          unit_price: toNumber(i.unitPrice, 0),
          amount: toNumber(i.qty, 0) * toNumber(i.unitPrice, 0),
        })),
      installments: installments.map((inst) => ({
        amount: toNumber(inst.amount, 0),
        paid_date: inst.paid_date,
        payment_method: inst.payment_method || "Bank Transfer",
      })),
    };

    try {
      if (isNew) {
        await createInvoice.mutateAsync(payload);
      } else {
        await updateInvoice.mutateAsync({ id: id!, ...payload });
      }
      navigate("/invoices");
    } catch {
      // Error handled in hooks
    }
  };

  const isLoading = invoiceLoading || companiesLoading;
  const isSaving = createInvoice.isPending || updateInvoice.isPending;

  const { data: selectedCompany } = useCompany(companyId || undefined);
  const { data: theme } = useTheme();
  const { data: branding } = useBranding();
  const { layout: invoiceLayout } = useEffectiveInvoiceLayout(companyId || undefined);
  const activeTheme = theme || defaultTheme;
  const previewCompany = useMemo(
    () =>
      selectedCompany
        ? {
            name: selectedCompany.name,
            tagline: selectedCompany.tagline,
            logo_url: selectedCompany.logo_url,
            email: selectedCompany.email,
            phone: selectedCompany.phone,
            address: selectedCompany.address,
            address_line1: selectedCompany.address_line1,
            address_line2: selectedCompany.address_line2,
            website: selectedCompany.website,
            thank_you_text: selectedCompany.thank_you_text,
            show_qr_code: selectedCompany.show_qr_code,
            footer_alignment: selectedCompany.footer_alignment,
          }
        : null,
    [selectedCompany]
  );

  const previewInvoice = useMemo(
    () => ({
      id: id || "preview",
      invoice_number: invoiceNumber || "DRAFT",
      client_name: clientName || "Client Name",
      client_email: clientEmail,
      client_phone: clientPhone,
      client_address: clientAddress,
      invoice_date: invoiceDate || TODAY,
      status,
      subtotal,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      notes,
    }),
    [id, invoiceNumber, clientName, clientEmail, clientPhone, clientAddress, invoiceDate, status, subtotal, vatAmount, totalAmount, paidAmount, dueAmount, notes]
  );

  const previewItems = useMemo(
    () =>
      items
        .filter((i) => i.title.trim() || i.qty > 0 || i.unitPrice > 0)
        .map((i) => ({
          id: i.id,
          title: i.title || "Item",
          qty: toNumber(i.qty, 0),
          unit_price: toNumber(i.unitPrice, 0),
          amount: toNumber(i.qty, 0) * toNumber(i.unitPrice, 0),
        })),
    [items]
  );

  const previewInstallments = useMemo(
    () =>
      installments.map((inst) => ({
        id: inst.id,
        amount: toNumber(inst.amount, 0),
        paid_date: inst.paid_date,
        payment_method: inst.payment_method,
      })),
    [installments]
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isNew && !existingInvoice && !invoiceLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground">
            Invoice not found
          </h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/invoices")}
          >
            Back to Invoices
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-[1800px] mx-auto">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            {isNew ? "New Invoice" : "Edit Invoice"}
          </h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,820px)]">
          <section className="rounded-md border bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-foreground">Invoice Details</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="invoiceNumber">Invoice #</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => handleFieldChange("invoiceNumber", e.target.value)}
                  className={errors.invoiceNumber ? "border-destructive" : ""}
                />
                {errors.invoiceNumber && <p className="text-xs text-destructive">{errors.invoiceNumber}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invoiceDate">Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => handleFieldChange("invoiceDate", e.target.value)}
                  className={errors.invoiceDate ? "border-destructive" : ""}
                />
                {errors.invoiceDate && <p className="text-xs text-destructive">{errors.invoiceDate}</p>}
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <Label>Company *</Label>
              <Select value={companyId} onValueChange={(v) => handleFieldChange("companyId", v)}>
                <SelectTrigger className={errors.companyId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companyId && <p className="text-xs text-destructive">{errors.companyId}</p>}
            </div>

            {pastClients.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <Label>Select Customer (or type manually below)</Label>
                <Select
                  onValueChange={(v) => {
                    const client = pastClients.find((p) => p.key === v);
                    if (!client) return;
                    setClientName(client.name);
                    setClientEmail(client.email || "");
                    setClientPhone(client.phone || "");
                    setClientAddress(client.address || "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {pastClients.map((client) => (
                      <SelectItem key={client.key} value={client.key}>
                        {client.name}
                        {client.phone ? ` - ${client.phone}` : client.email ? ` - ${client.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="clientName">Customer Name *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => handleFieldChange("clientName", e.target.value)}
                  className={errors.clientName ? "border-destructive" : ""}
                />
                {errors.clientName && <p className="text-xs text-destructive">{errors.clientName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientEmail">Customer Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => handleFieldChange("clientEmail", e.target.value)}
                  placeholder="Email"
                  className={errors.clientEmail ? "border-destructive" : ""}
                />
                {errors.clientEmail && <p className="text-xs text-destructive">{errors.clientEmail}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientPhone">Customer Phone</Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => handleFieldChange("clientPhone", e.target.value)}
                  placeholder="Phone"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientAddress">Customer Address</Label>
                <Textarea
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => handleFieldChange("clientAddress", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">$ Line Items</h3>
              <Button variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="mt-3 space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="rounded-md border bg-background p-4">
                  <div className="flex gap-3">
                    <span className="pt-2 text-sm text-muted-foreground">{idx + 1}.</span>
                    <div className="flex-1">
                      <Input
                        value={item.title}
                        onChange={(e) => handleUpdateItem(item.id, "title", e.target.value)}
                        className={errors[`items.${idx}.title`] ? "border-destructive" : ""}
                      />
                      {errors[`items.${idx}.title`] && (
                        <p className="mt-1 text-xs text-destructive">{errors[`items.${idx}.title`]}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_160px]">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => handleUpdateItem(item.id, "qty", e.target.value)}
                        className="text-center tabular-nums"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(item.id, "unitPrice", e.target.value)}
                        className="tabular-nums"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Total</Label>
                      <div className="flex h-10 items-center justify-end rounded-md px-3 font-bold tabular-nums">
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 flex justify-end text-sm">
              <span className="text-muted-foreground">Subtotal:&nbsp;</span>
              <span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
            </div>

            <div className="mt-4 space-y-1.5">
              <Label htmlFor="taxAmount">Tax Amount</Label>
              <Input
                id="taxAmount"
                type="number"
                min={0}
                value={Number.isFinite(vatAmount) ? Number(vatAmount.toFixed(2)) : 0}
                onChange={(e) => {
                  const amount = Math.max(0, toNumber(e.target.value, 0));
                  setVatRate(subtotal > 0 ? (amount / subtotal) * 100 : 0);
                }}
              />
            </div>

            <div className="mt-5 flex justify-end text-lg font-bold">
              Total: <span className="ml-2 tabular-nums">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="mt-4 space-y-1.5">
              <Label>Status</Label>
              <Select
                value={statusOverride}
                onValueChange={(v) => setStatusOverride(v as InvoiceStatus | "auto")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto ({status})</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Payments</h3>
              <Button variant="outline" size="sm" onClick={handleAddInstallment}>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </div>
            {installments.length > 0 && (
              <div className="mt-3 space-y-3">
                {installments.map((inst, idx) => (
                  <PaymentCard
                    key={inst.id}
                    inst={inst}
                    index={idx}
                    onUpdate={(field, value) => handleUpdateInstallment(inst.id, field, value)}
                    onRemove={() => handleRemoveInstallment(inst.id)}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 space-y-1.5">
              <Label htmlFor="amountInWords">Amount in Words</Label>
              <Input
                id="amountInWords"
                value={amountInWords}
                onChange={(e) => setAmountInWords(e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>

            <div className="mt-4 space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                rows={4}
                className={errors.notes ? "border-destructive" : ""}
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="mt-4 w-full bg-orange-500 text-white hover:bg-orange-600"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Invoice
            </Button>
          </section>

          <aside className="lg:sticky lg:top-6 h-fit">
            <InvoiceA4Preview
              className="rounded-md bg-neutral-100 p-3 max-h-[calc(100vh-4rem)] overflow-auto"
              invoice={previewInvoice}
              items={previewItems}
              installments={previewInstallments}
              company={previewCompany}
              theme={activeTheme}
              branding={branding}
              layout={invoiceLayout}
            />
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
