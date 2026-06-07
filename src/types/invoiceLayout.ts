// Invoice Layout CMS — controls every visual aspect of the invoice document.
// Stored as JSONB. `null` per-company override means inherit global.

export interface InvoiceLayout {
  typography: {
    fontFamily: string;
    baseFontSize: number;        // pt
    headingScale: number;        // multiplier for INVOICE title
    lineHeight: number;
  };
  header: {
    paddingTop: number;          // mm
    paddingX: number;            // mm
    marginBottom: number;        // mm
    showLogo: boolean;
    logoSize: number;            // px
    showTagline: boolean;
    titleText: string;           // e.g. "INVOICE"
    titleSize: number;           // pt
    titleColor: string;
    showInvoiceNumber: boolean;
    showStatusBadge: boolean;
    companyNameSize: number;     // pt
  };
  body: {
    sectionGap: number;          // mm
    showBilledTo: boolean;
    showInvoiceDate: boolean;
    tableFontSize: number;       // pt
    tableHeaderSize: number;     // pt
    rowPaddingY: number;         // px
    rowPaddingX: number;         // px
    showSlNo: boolean;
    showQty: boolean;
    showUnitPrice: boolean;
    showAmount: boolean;
    colLabels: {
      description: string;
      qty: string;
      unitPrice: string;
      amount: string;
    };
    colWidths: { description: number; qty: number; unitPrice: number; amount: number }; // %
    showSubtotal: boolean;
    showVat: boolean;
    vatLabel: string;
    showTotal: boolean;
    showPaid: boolean;
    showBalance: boolean;
    showInWords: boolean;
    showNotes: boolean;
    showPaymentHistory: boolean;
  };
  footer: {
    paddingTop: number;          // mm
    fontSize: number;            // pt
    showThankYou: boolean;
    showAddress: boolean;
    showContact: boolean;
    showWebsite: boolean;
    showQR: boolean;
    qrSize: number;              // px
    showSignatures: boolean;
    signatureGap: number;        // mm
    signatureHeight: number;     // px
    signatureLabels: {
      received: string;
      prepared: string;
      authorize: string;
    };
  };
}

export const defaultInvoiceLayout: InvoiceLayout = {
  typography: {
    fontFamily: "Arial, Helvetica, sans-serif",
    baseFontSize: 10,
    headingScale: 3.6,
    lineHeight: 1.35,
  },
  header: {
    paddingTop: 14,
    paddingX: 16,
    marginBottom: 6,
    showLogo: true,
    logoSize: 52,
    showTagline: true,
    titleText: "INVOICE",
    titleSize: 10,
    titleColor: "#243f8f",
    showInvoiceNumber: true,
    showStatusBadge: true,
    companyNameSize: 15,
  },
  body: {
    sectionGap: 6,
    showBilledTo: true,
    showInvoiceDate: true,
    tableFontSize: 10,
    tableHeaderSize: 8,
    rowPaddingY: 8,
    rowPaddingX: 0,
    showSlNo: false,
    showQty: true,
    showUnitPrice: true,
    showAmount: true,
    colLabels: {
      description: "Description",
      qty: "Qty",
      unitPrice: "Unit Price",
      amount: "Total",
    },
    colWidths: { description: 48, qty: 12, unitPrice: 20, amount: 20 },
    showSubtotal: true,
    showVat: true,
    vatLabel: "Tax",
    showTotal: true,
    showPaid: true,
    showBalance: true,
    showInWords: true,
    showNotes: true,
    showPaymentHistory: true,
  },
  footer: {
    paddingTop: 4,
    fontSize: 8,
    showThankYou: true,
    showAddress: true,
    showContact: true,
    showWebsite: false,
    showQR: true,
    qrSize: 52,
    showSignatures: true,
    signatureGap: 10,
    signatureHeight: 44,
    signatureLabels: {
      received: "Received by",
      prepared: "Prepared by",
      authorize: "Authorize by",
    },
  },
};

// Deep merge an override on top of a base layout. Override values can be partial.
export function mergeLayout(
  base: InvoiceLayout,
  override?: Partial<InvoiceLayout> | null
): InvoiceLayout {
  if (!override) return base;
  return {
    typography: { ...base.typography, ...(override.typography || {}) },
    header: { ...base.header, ...(override.header || {}) },
    body: {
      ...base.body,
      ...(override.body || {}),
      colLabels: { ...base.body.colLabels, ...(override.body?.colLabels || {}) },
      colWidths: { ...base.body.colWidths, ...(override.body?.colWidths || {}) },
    },
    footer: {
      ...base.footer,
      ...(override.footer || {}),
      signatureLabels: {
        ...base.footer.signatureLabels,
        ...(override.footer?.signatureLabels || {}),
      },
    },
  };
}
