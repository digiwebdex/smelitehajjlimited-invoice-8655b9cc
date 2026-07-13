import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface QuickEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
    client_address: string | null;
    notes: string | null;
  };
}

export function QuickEditSheet({ open, onOpenChange, invoice }: QuickEditSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [clientName, setClientName] = useState(invoice.client_name);
  const [clientEmail, setClientEmail] = useState(invoice.client_email || "");
  const [clientPhone, setClientPhone] = useState(invoice.client_phone || "");
  const [clientAddress, setClientAddress] = useState(invoice.client_address || "");
  const [notes, setNotes] = useState(invoice.notes || "");

  useEffect(() => {
    if (open) {
      setClientName(invoice.client_name);
      setClientEmail(invoice.client_email || "");
      setClientPhone(invoice.client_phone || "");
      setClientAddress(invoice.client_address || "");
      setNotes(invoice.notes || "");
    }
  }, [open, invoice]);

  const handleSave = async () => {
    if (!clientName.trim()) {
      toast({ title: "Client name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await api.patch(`/invoices/${invoice.id}/quick-edit`, {
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || null,
        client_phone: clientPhone.trim() || null,
        client_address: clientAddress.trim() || null,
        notes: notes.trim() || null,
      });

      if (error) throw new Error(error);
      if (!data) throw new Error("Invoice not found or could not be updated");

      queryClient.invalidateQueries({ queryKey: ["invoice", user?.id, invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });

      toast({ title: "Invoice updated", description: "Quick corrections saved successfully." });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Quick Edit — {invoice.invoice_number}</SheetTitle>
          <SheetDescription>
            Make quick corrections to client details and notes.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="qe-clientName">Client Name *</Label>
            <Input
              id="qe-clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qe-clientEmail">Email</Label>
            <Input
              id="qe-clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qe-clientPhone">Phone</Label>
            <Input
              id="qe-clientPhone"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+880 1XXX XXXXXX"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qe-clientAddress">Address</Label>
            <Input
              id="qe-clientAddress"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="Enter address"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qe-notes">Notes / Payment Terms</Label>
            <Textarea
              id="qe-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              rows={4}
              maxLength={1000}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
