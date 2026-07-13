import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { useBranding } from "@/hooks/useBranding";
import { useCompanies } from "@/hooks/useCompanies";
import {
  useGlobalInvoiceLayout,
  useUpdateGlobalInvoiceLayout,
  useCompanyInvoiceLayout,
  useUpdateCompanyInvoiceLayout,
} from "@/hooks/useInvoiceLayout";
import { defaultInvoiceLayout, InvoiceLayout, mergeLayout } from "@/types/invoiceLayout";
import { defaultTheme } from "@/types/theme";
import { InvoiceA4Preview } from "@/components/invoice/InvoiceA4Preview";

const sampleInvoice = {
  id: "preview",
  invoice_number: "INV-2026-001",
  client_name: "Sample Client Ltd.",
  client_email: "client@example.com",
  client_phone: "+880 1700-000000",
  client_address: "Dhaka, Bangladesh",
  invoice_date: new Date().toISOString(),
  status: "partial",
  subtotal: 50000,
  vat_amount: 7500,
  total_amount: 57500,
  paid_amount: 30000,
  due_amount: 27500,
  notes: "Thank you for your business.",
};
const sampleItems = [
  { id: "1", title: "Hajj Package — Premium", amount: 35000, qty: 1, unit_price: 35000 },
  { id: "2", title: "Umrah Add-on", amount: 15000, qty: 1, unit_price: 15000 },
];
const sampleInstallments = [
  { id: "1", amount: 30000, paid_date: new Date().toISOString(), payment_method: "Bank Transfer" },
];

export default function InvoiceLayoutSettings() {
  const { toast } = useToast();
  const { data: theme } = useTheme();
  const { data: branding } = useBranding();
  const { data: companies } = useCompanies();

  const [scope, setScope] = useState<"global" | string>("global");
  const companyId = scope === "global" ? null : scope;

  const globalQ = useGlobalInvoiceLayout();
  const companyQ = useCompanyInvoiceLayout(companyId);
  const updateGlobal = useUpdateGlobalInvoiceLayout();
  const updateCompany = useUpdateCompanyInvoiceLayout(companyId);

  const [form, setForm] = useState<InvoiceLayout>(defaultInvoiceLayout);

  useEffect(() => {
    if (scope === "global") {
      setForm(globalQ.data || defaultInvoiceLayout);
    } else {
      const base = globalQ.data || defaultInvoiceLayout;
      setForm(mergeLayout(base, companyQ.data));
    }
  }, [scope, globalQ.data, companyQ.data]);

  const update = <K extends keyof InvoiceLayout>(section: K, patch: Partial<InvoiceLayout[K]>) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], ...patch } }));

  const handleSave = async () => {
    try {
      if (scope === "global") {
        await updateGlobal.mutateAsync(form);
      } else {
        await updateCompany.mutateAsync(form);
      }
      toast({ title: "Layout saved", description: scope === "global" ? "Global defaults updated." : "Company override saved." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleReset = async () => {
    if (scope === "global") {
      setForm(defaultInvoiceLayout);
    } else {
      try {
        await updateCompany.mutateAsync(null);
        toast({ title: "Override cleared", description: "This company now inherits global defaults." });
      } catch (e: any) {
        toast({ title: "Reset failed", description: e.message, variant: "destructive" });
      }
    }
  };

  const isLoading = globalQ.isLoading || (companyId && companyQ.isLoading);
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
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invoice Layout CMS</h1>
            <p className="text-muted-foreground">Control every visual aspect of the invoice document</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-full sm:w-[260px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global Defaults</SelectItem>
                {companies?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} (override)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {scope === "global" ? "Reset Form" : "Clear Override"}
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={handleSave} disabled={updateGlobal.isPending || updateCompany.isPending}>
              {(updateGlobal.isPending || updateCompany.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Layout Controls</CardTitle>
              <CardDescription>Editing: {scope === "global" ? "Global Defaults" : companies?.find((c: any) => c.id === scope)?.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="typography">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="typography">Typography</TabsTrigger>
                  <TabsTrigger value="header">Header</TabsTrigger>
                  <TabsTrigger value="body">Body</TabsTrigger>
                  <TabsTrigger value="footer">Footer</TabsTrigger>
                </TabsList>

                {/* TYPOGRAPHY */}
                <TabsContent value="typography" className="space-y-5 pt-4">
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select value={form.typography.fontFamily} onValueChange={(v) => update("typography", { fontFamily: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Inter (Sans-serif)</SelectItem>
                        <SelectItem value="'Noto Serif', 'Times New Roman', serif">Noto Serif</SelectItem>
                        <SelectItem value="Georgia, 'Times New Roman', serif">Georgia</SelectItem>
                        <SelectItem value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</SelectItem>
                        <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <SliderRow label="Base Font Size" value={form.typography.baseFontSize} min={8} max={16} step={0.5} unit="pt" onChange={(v) => update("typography", { baseFontSize: v })} />
                  <SliderRow label="Heading Scale" value={form.typography.headingScale} min={0.6} max={2} step={0.05} unit="x" onChange={(v) => update("typography", { headingScale: v })} />
                  <SliderRow label="Line Height" value={form.typography.lineHeight} min={1} max={2.2} step={0.05} unit="" onChange={(v) => update("typography", { lineHeight: v })} />
                </TabsContent>

                {/* HEADER */}
                <TabsContent value="header" className="space-y-5 pt-4">
                  <SliderRow label="Padding Top" value={form.header.paddingTop} min={4} max={40} step={1} unit="mm" onChange={(v) => update("header", { paddingTop: v })} />
                  <SliderRow label="Padding Horizontal" value={form.header.paddingX} min={4} max={40} step={1} unit="mm" onChange={(v) => update("header", { paddingX: v })} />
                  <SliderRow label="Margin Below Header" value={form.header.marginBottom} min={0} max={40} step={1} unit="mm" onChange={(v) => update("header", { marginBottom: v })} />
                  <Separator />
                  <SwitchRow label="Show Logo" checked={form.header.showLogo} onChange={(v) => update("header", { showLogo: v })} />
                  <SliderRow label="Logo Size" value={form.header.logoSize} min={24} max={120} step={2} unit="px" onChange={(v) => update("header", { logoSize: v })} />
                  <SwitchRow label="Show Tagline" checked={form.header.showTagline} onChange={(v) => update("header", { showTagline: v })} />
                  <SliderRow label="Company Name Size" value={form.header.companyNameSize} min={10} max={28} step={0.5} unit="pt" onChange={(v) => update("header", { companyNameSize: v })} />
                  <Separator />
                  <div className="space-y-2">
                    <Label>Title Text</Label>
                    <Input value={form.header.titleText} onChange={(e) => update("header", { titleText: e.target.value })} />
                  </div>
                  <SliderRow label="Title Size" value={form.header.titleSize} min={14} max={48} step={1} unit="pt" onChange={(v) => update("header", { titleSize: v })} />
                  <div className="space-y-2">
                    <Label>Title Color</Label>
                    <Input type="color" value={form.header.titleColor} onChange={(e) => update("header", { titleColor: e.target.value })} className="h-10 w-24 p-1" />
                  </div>
                  <SwitchRow label="Show Invoice Number" checked={form.header.showInvoiceNumber} onChange={(v) => update("header", { showInvoiceNumber: v })} />
                  <SwitchRow label="Show Status Badge" checked={form.header.showStatusBadge} onChange={(v) => update("header", { showStatusBadge: v })} />
                </TabsContent>

                {/* BODY */}
                <TabsContent value="body" className="space-y-5 pt-4">
                  <SliderRow label="Section Gap" value={form.body.sectionGap} min={0} max={30} step={1} unit="mm" onChange={(v) => update("body", { sectionGap: v })} />
                  <SwitchRow label="Show 'Billed To'" checked={form.body.showBilledTo} onChange={(v) => update("body", { showBilledTo: v })} />
                  <SwitchRow label="Show Invoice Date" checked={form.body.showInvoiceDate} onChange={(v) => update("body", { showInvoiceDate: v })} />
                  <Separator />
                  <h4 className="font-medium text-sm">Item Table</h4>
                  <SliderRow label="Table Font Size" value={form.body.tableFontSize} min={7} max={14} step={0.5} unit="pt" onChange={(v) => update("body", { tableFontSize: v })} />
                  <SliderRow label="Table Header Size" value={form.body.tableHeaderSize} min={6} max={12} step={0.5} unit="pt" onChange={(v) => update("body", { tableHeaderSize: v })} />
                  <SliderRow label="Row Padding Y" value={form.body.rowPaddingY} min={2} max={20} step={1} unit="px" onChange={(v) => update("body", { rowPaddingY: v })} />
                  <SliderRow label="Row Padding X" value={form.body.rowPaddingX} min={0} max={16} step={1} unit="px" onChange={(v) => update("body", { rowPaddingX: v })} />
                  <SwitchRow label="Show Qty Column" checked={form.body.showQty} onChange={(v) => update("body", { showQty: v })} />
                  <SwitchRow label="Show Unit Price Column" checked={form.body.showUnitPrice} onChange={(v) => update("body", { showUnitPrice: v })} />
                  <SwitchRow label="Show Amount Column" checked={form.body.showAmount} onChange={(v) => update("body", { showAmount: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <LabeledInput label="Description Label" value={form.body.colLabels.description} onChange={(v) => update("body", { colLabels: { ...form.body.colLabels, description: v } })} />
                    <LabeledInput label="Qty Label" value={form.body.colLabels.qty} onChange={(v) => update("body", { colLabels: { ...form.body.colLabels, qty: v } })} />
                    <LabeledInput label="Unit Price Label" value={form.body.colLabels.unitPrice} onChange={(v) => update("body", { colLabels: { ...form.body.colLabels, unitPrice: v } })} />
                    <LabeledInput label="Amount Label" value={form.body.colLabels.amount} onChange={(v) => update("body", { colLabels: { ...form.body.colLabels, amount: v } })} />
                  </div>
                  <Separator />
                  <h4 className="font-medium text-sm">Totals</h4>
                  <SwitchRow label="Show Subtotal" checked={form.body.showSubtotal} onChange={(v) => update("body", { showSubtotal: v })} />
                  <SwitchRow label="Show VAT/Tax" checked={form.body.showVat} onChange={(v) => update("body", { showVat: v })} />
                  <LabeledInput label="VAT Label" value={form.body.vatLabel} onChange={(v) => update("body", { vatLabel: v })} />
                  <SwitchRow label="Show Total" checked={form.body.showTotal} onChange={(v) => update("body", { showTotal: v })} />
                  <SwitchRow label="Show Total Paid" checked={form.body.showPaid} onChange={(v) => update("body", { showPaid: v })} />
                  <SwitchRow label="Show Balance Box" checked={form.body.showBalance} onChange={(v) => update("body", { showBalance: v })} />
                  <SwitchRow label="Show 'In Words'" checked={form.body.showInWords} onChange={(v) => update("body", { showInWords: v })} />
                  <SwitchRow label="Show Notes" checked={form.body.showNotes} onChange={(v) => update("body", { showNotes: v })} />
                  <SwitchRow label="Show Payment History" checked={form.body.showPaymentHistory} onChange={(v) => update("body", { showPaymentHistory: v })} />
                </TabsContent>

                {/* FOOTER */}
                <TabsContent value="footer" className="space-y-5 pt-4">
                  <SliderRow label="Footer Padding Top" value={form.footer.paddingTop} min={0} max={20} step={0.5} unit="mm" onChange={(v) => update("footer", { paddingTop: v })} />
                  <SliderRow label="Footer Font Size" value={form.footer.fontSize} min={6} max={12} step={0.5} unit="pt" onChange={(v) => update("footer", { fontSize: v })} />
                  <Separator />
                  <SwitchRow label="Show Thank You" checked={form.footer.showThankYou} onChange={(v) => update("footer", { showThankYou: v })} />
                  <SwitchRow label="Show Address" checked={form.footer.showAddress} onChange={(v) => update("footer", { showAddress: v })} />
                  <SwitchRow label="Show Contact (phone/email)" checked={form.footer.showContact} onChange={(v) => update("footer", { showContact: v })} />
                  <SwitchRow label="Show Website" checked={form.footer.showWebsite} onChange={(v) => update("footer", { showWebsite: v })} />
                  <SwitchRow label="Show QR Code" checked={form.footer.showQR} onChange={(v) => update("footer", { showQR: v })} />
                  <SliderRow label="QR Size" value={form.footer.qrSize} min={32} max={140} step={2} unit="px" onChange={(v) => update("footer", { qrSize: v })} />
                  <Separator />
                  <SwitchRow label="Show Signatures" checked={form.footer.showSignatures} onChange={(v) => update("footer", { showSignatures: v })} />
                  <SliderRow label="Signature Gap" value={form.footer.signatureGap} min={0} max={30} step={1} unit="mm" onChange={(v) => update("footer", { signatureGap: v })} />
                  <SliderRow label="Signature Height" value={form.footer.signatureHeight} min={20} max={120} step={2} unit="px" onChange={(v) => update("footer", { signatureHeight: v })} />
                  <div className="grid grid-cols-3 gap-3">
                    <LabeledInput label="Received Label" value={form.footer.signatureLabels.received} onChange={(v) => update("footer", { signatureLabels: { ...form.footer.signatureLabels, received: v } })} />
                    <LabeledInput label="Prepared Label" value={form.footer.signatureLabels.prepared} onChange={(v) => update("footer", { signatureLabels: { ...form.footer.signatureLabels, prepared: v } })} />
                    <LabeledInput label="Authorize Label" value={form.footer.signatureLabels.authorize} onChange={(v) => update("footer", { signatureLabels: { ...form.footer.signatureLabels, authorize: v } })} />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <div className="xl:sticky xl:top-6 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>Sample invoice updates as you tweak controls</CardDescription>
              </CardHeader>
              <CardContent className="bg-neutral-100 p-3 max-h-[80vh] overflow-auto">
                <InvoiceA4Preview
                  invoice={sampleInvoice as any}
                  items={sampleItems}
                  installments={sampleInstallments}
                  company={null}
                  theme={theme || defaultTheme}
                  branding={branding}
                  layout={form}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SliderRow({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between"><Label>{label}</Label><span className="text-sm text-muted-foreground">{value}{unit}</span></div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
