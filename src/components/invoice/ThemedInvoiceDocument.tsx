import { InvoiceQRCode } from "@/components/InvoiceQRCode";
import { ThemeSettings, defaultTheme } from "@/types/theme";
import { BrandSettings, defaultBranding } from "@/types/branding";
import { numberToWords } from "@/lib/numberToWords";
import { getInvoiceFooterDetails } from "@/lib/invoiceFooter";
import { InvoiceLayout, defaultInvoiceLayout } from "@/types/invoiceLayout";

const getOrdinal = (n: number): string => {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
};

const SAMPLE = {
  blue: "#243f8f",
  orange: "#f97316",
  teal: "#0f8b7e",
  green: "#166534",
  greenBg: "#dcfce7",
  paidFullBg: "#166f36",
  paidFullText: "#ffffff",
  red: "#b91c1c",
  redBg: "#fee2e2",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
};

interface InvoiceItemData {
  id: string;
  title: string;
  amount: number;
  qty?: number;
  unit_price?: number;
}

interface InstallmentData {
  id: string;
  amount: number;
  paid_date: string;
  payment_method?: string;
}

interface CompanyData {
  name: string;
  tagline?: string | null;
  logo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  website?: string | null;
  thank_you_text?: string | null;
  show_qr_code?: boolean | null;
  footer_alignment?: string | null;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  invoice_date: string;
  status: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  notes?: string | null;
}

export interface InvoicePageSlice {
  showHeader?: boolean;
  showBillTo?: boolean;
  showSummary?: boolean;
  showInWords?: boolean;
  showNotes?: boolean;
  showPaymentHistory?: boolean;
  showFooter?: boolean;
}

interface ThemedInvoiceDocumentProps {
  invoice: InvoiceData;
  items: InvoiceItemData[];
  installments: InstallmentData[];
  company?: CompanyData | null;
  theme: ThemeSettings;
  branding?: BrandSettings | null;
  layout?: InvoiceLayout;
  pdfMode?: boolean;
  pageSlice?: InvoicePageSlice;
  pageLabel?: string;
}

const cleanNumber = (value: number | string | null | undefined) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

const titleCase = (value: string) =>
  value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

/** Pill badge — fixed height + line-height centers text reliably in html2canvas PDF */
const InvoicePillBadge = ({
  label,
  backgroundColor,
  color,
  size = "md",
  className = "",
}: {
  label: string;
  backgroundColor: string;
  color: string;
  size?: "sm" | "md";
  className?: string;
}) => (
  <span
    className={`invoice-pill-badge invoice-pill-badge--${size} ${className}`.trim()}
    style={{ backgroundColor, color }}
  >
    {label}
  </span>
);

/**
 * Reference invoice layout — matches Glorious Printing Zone PDF design.
 * One template for on-screen preview, print, and PDF download.
 */
export const ThemedInvoiceDocument = ({
  invoice,
  items,
  installments,
  company,
  theme,
  branding,
  layout,
  pdfMode = false,
  pageSlice,
  pageLabel,
}: ThemedInvoiceDocumentProps) => {
  theme || defaultTheme;
  const b = branding || defaultBranding;
  const L = layout || defaultInvoiceLayout;

  const showSection = (key: keyof InvoicePageSlice) =>
    !pageSlice || pageSlice[key] !== false;

  const formatCurrency = (amount: number) =>
    `Tk ${new Intl.NumberFormat("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cleanNumber(amount))}`;

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const headerLogo = company?.logo_url || b.company_logo;
  const headerName = company?.name || b.company_name || "Company Name";
  const headerTagline = company?.tagline || b.tagline || "";

  const {
    addressLine1,
    addressLine2,
    footerEmail,
    footerPhone,
    footerThankYou,
    showQR,
  } = getInvoiceFooterDetails(company, branding);

  const subtotal = cleanNumber(invoice.subtotal);
  const vatAmount = cleanNumber(invoice.vat_amount);
  const totalAmount = cleanNumber(invoice.total_amount);
  const paidAmount = cleanNumber(invoice.paid_amount);
  const dueAmount = cleanNumber(invoice.due_amount);

  const inWordsRaw = numberToWords(Math.round(totalAmount));
  const inWords = `${titleCase(inWordsRaw)} Taka Only`;

  const status = (invoice.status || "unpaid").toLowerCase();
  const isPaid = status === "paid";
  const isPartial = status === "partial";

  const statusStyle = isPaid
    ? { background: SAMPLE.greenBg, color: SAMPLE.green }
    : isPartial
      ? { background: "#fef3c7", color: "#92400e" }
      : { background: SAMPLE.redBg, color: SAMPLE.red };

  const pagePadding = `${L.header.paddingTop}mm ${L.header.paddingX}mm 12mm`;

  return (
    <div
      className="invoice-document invoice-sample-document invoice-print-document"
      style={{
        width: "210mm",
        minHeight: pdfMode ? "auto" : "297mm",
        margin: "0 auto",
        padding: pagePadding,
        boxSizing: "border-box",
        color: SAMPLE.text,
        background: "#ffffff",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: `${L.typography.baseFontSize}pt`,
        lineHeight: L.typography.lineHeight,
        boxShadow: pdfMode ? "none" : "0 10px 35px rgba(15,23,42,0.10)",
        borderRadius: pdfMode ? 0 : "10px",
        display: pdfMode ? "block" : "flex",
        flexDirection: pdfMode ? undefined : "column",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {pageLabel && (
        <div
          style={{
            fontSize: "8pt",
            color: SAMPLE.muted,
            textAlign: "right",
            marginBottom: "3mm",
            letterSpacing: "0.04em",
          }}
        >
          {pageLabel} — continued
        </div>
      )}

      {/* HEADER */}
      {showSection("showHeader") && (
      <header
        className="invoice-print-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "10mm",
          marginBottom: `${L.header.marginBottom}mm`,
        }}
      >
        <div style={{ display: "flex", gap: "4mm", alignItems: "flex-start", minWidth: 0, flex: 1 }}>
          {L.header.showLogo && (headerLogo ? (
            <img
              src={headerLogo}
              alt={headerName}
              style={{
                width: `${L.header.logoSize}px`,
                height: `${L.header.logoSize}px`,
                borderRadius: "50%",
                objectFit: "cover",
                border: `1.2px solid ${SAMPLE.blue}`,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: `${L.header.logoSize}px`,
                height: `${L.header.logoSize}px`,
                borderRadius: "50%",
                background: SAMPLE.blue,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "15pt",
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {headerName.charAt(0)}
            </div>
          ))}

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: `${L.header.companyNameSize}pt`,
                lineHeight: 1.1,
                fontWeight: 800,
                color: SAMPLE.blue,
                letterSpacing: "-0.2px",
              }}
            >
              {headerName}
            </div>
            {L.header.showTagline && headerTagline && (
              <div
                style={{
                  fontSize: "9pt",
                  color: SAMPLE.muted,
                  marginTop: "2px",
                  fontStyle: "italic",
                }}
              >
                {headerTagline}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontSize: `${L.header.titleSize * L.typography.headingScale}pt`,
              lineHeight: 1,
              fontWeight: 800,
              color: SAMPLE.blue,
              letterSpacing: "0.5px",
            }}
          >
            {L.header.titleText}
          </div>
          {L.header.showInvoiceNumber && (
            <div
              style={{
                fontSize: "12pt",
                color: SAMPLE.orange,
                fontWeight: 800,
                marginTop: "4px",
              }}
            >
              {invoice.invoice_number}
            </div>
          )}
          {L.header.showStatusBadge && (
            <div style={{ marginTop: "6px", textAlign: "right" }}>
              <InvoicePillBadge
                label={invoice.status || "Unpaid"}
                backgroundColor={statusStyle.background}
                color={statusStyle.color}
                size="md"
                className="invoice-pill-badge--status"
              />
            </div>
          )}
        </div>
      </header>
      )}

      {/* BILL TO + DATE */}
      {showSection("showBillTo") && (L.body.showBilledTo || L.body.showInvoiceDate) && (
        <section
          className="invoice-print-billto"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            columnGap: "8mm",
            alignItems: "start",
            borderTop: `1px solid ${SAMPLE.border}`,
            paddingTop: "5mm",
            marginBottom: `${L.body.sectionGap}mm`,
          }}
        >
          {L.body.showBilledTo && (
            <div style={{ borderLeft: `4px solid ${SAMPLE.teal}`, paddingLeft: "4mm" }}>
              <div
                style={{
                  fontSize: "8pt",
                  fontWeight: 600,
                  color: SAMPLE.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  marginBottom: "4px",
                }}
              >
                BILL TO
              </div>
              <div
                style={{
                  fontSize: "14pt",
                  fontWeight: 800,
                  color: SAMPLE.text,
                  textTransform: "uppercase",
                  lineHeight: 1.2,
                }}
              >
                {invoice.client_name}
              </div>
              {invoice.client_address && (
                <div
                  style={{
                    color: SAMPLE.muted,
                    marginTop: "3px",
                    whiteSpace: "pre-line",
                    maxWidth: "100mm",
                    textTransform: "uppercase",
                    fontSize: "8.5pt",
                    lineHeight: 1.4,
                  }}
                >
                  {invoice.client_address}
                </div>
              )}
              {invoice.client_phone && (
                <div style={{ color: SAMPLE.muted, marginTop: "2px", fontSize: "8.5pt" }}>
                  {invoice.client_phone}
                </div>
              )}
              {invoice.client_email && (
                <div style={{ color: SAMPLE.muted, marginTop: "2px", fontSize: "8.5pt" }}>
                  {invoice.client_email}
                </div>
              )}
            </div>
          )}

          {L.body.showInvoiceDate && (
            <div
              style={{
                textAlign: "right",
                whiteSpace: "nowrap",
                fontSize: "10pt",
                paddingTop: "1mm",
              }}
            >
              <span style={{ fontWeight: 700, color: SAMPLE.muted, textTransform: "uppercase" }}>
                INVOICE DATE :{" "}
              </span>
              <span style={{ fontWeight: 700, color: SAMPLE.text }}>
                {formatDate(invoice.invoice_date)}
              </span>
            </div>
          )}
        </section>
      )}

      {/* ITEM TABLE — always shown when items exist; thead repeats on each PDF page */}
      {items.length > 0 && (
      <table
        className="invoice-items invoice-print-table"
        style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4mm", fontSize: `${L.body.tableFontSize}pt` }}
      >
        <colgroup>
          <col style={{ width: `${L.body.colWidths.description}%` }} />
          {L.body.showQty && <col style={{ width: `${L.body.colWidths.qty}%` }} />}
          {L.body.showUnitPrice && <col style={{ width: `${L.body.colWidths.unitPrice}%` }} />}
          {L.body.showAmount && <col style={{ width: `${L.body.colWidths.amount}%` }} />}
        </colgroup>
        <thead>
          <tr style={{ borderBottom: `1px solid ${SAMPLE.border}` }}>
            <th
              style={{
                textAlign: "left",
                padding: `${L.body.rowPaddingY}px 0`,
                color: SAMPLE.muted,
                fontSize: `${L.body.tableHeaderSize}pt`,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              {L.body.colLabels.description.toUpperCase()}
            </th>
            {L.body.showQty && (
              <th
                style={{
                  textAlign: "center",
                  padding: `${L.body.rowPaddingY}px 0`,
                  color: SAMPLE.muted,
                  fontSize: `${L.body.tableHeaderSize}pt`,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {L.body.colLabels.qty.toUpperCase()}
              </th>
            )}
            {L.body.showUnitPrice && (
              <th
                style={{
                  textAlign: "right",
                  padding: `${L.body.rowPaddingY}px 0`,
                  color: SAMPLE.muted,
                  fontSize: `${L.body.tableHeaderSize}pt`,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {L.body.colLabels.unitPrice.toUpperCase()}
              </th>
            )}
            {L.body.showAmount && (
              <th
                style={{
                  textAlign: "right",
                  padding: `${L.body.rowPaddingY}px 0`,
                  color: SAMPLE.muted,
                  fontSize: `${L.body.tableHeaderSize}pt`,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {L.body.colLabels.amount.toUpperCase()}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const qty = item.qty || 1;
            const unitPrice = cleanNumber(item.unit_price ?? cleanNumber(item.amount) / qty);
            const total = cleanNumber(item.amount);
            return (
              <tr key={item.id} className="invoice-row invoice-print-row" style={{ borderBottom: `1px solid ${SAMPLE.border}` }}>
                <td
                  style={{
                    padding: `${L.body.rowPaddingY}px 0`,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: SAMPLE.text,
                  }}
                >
                  {item.title}
                </td>
                {L.body.showQty && (
                  <td style={{ padding: `${L.body.rowPaddingY}px 0`, textAlign: "center", color: SAMPLE.text }}>
                    {qty}
                  </td>
                )}
                {L.body.showUnitPrice && (
                  <td style={{ padding: `${L.body.rowPaddingY}px 0`, textAlign: "right", color: SAMPLE.text }}>
                    {formatCurrency(unitPrice)}
                  </td>
                )}
                {L.body.showAmount && (
                  <td style={{ padding: `${L.body.rowPaddingY}px 0`, textAlign: "right", fontWeight: 700, color: SAMPLE.text }}>
                    {formatCurrency(total)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      )}

      {/* SUMMARY */}
      {showSection("showSummary") && (
      <section
        className="invoice-totals invoice-print-summary invoice-keep-together"
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: "3mm" }}
      >
        <div style={{ width: "58mm", fontSize: "10pt" }}>
          {[
            { label: "Subtotal", value: subtotal, bold: false, color: SAMPLE.text, show: L.body.showSubtotal },
            { label: L.body.vatLabel, value: vatAmount, bold: false, color: SAMPLE.text, show: L.body.showVat },
            { label: "Total", value: totalAmount, bold: true, color: SAMPLE.text, show: L.body.showTotal },
            { label: "Total Paid", value: paidAmount, bold: false, color: SAMPLE.green, show: L.body.showPaid },
          ]
            .filter((row) => row.show)
            .map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "4mm",
                  padding: "5px 0",
                  borderBottom: `1px solid ${SAMPLE.border}`,
                }}
              >
                <span style={{ color: SAMPLE.text, fontWeight: row.bold ? 800 : 500 }}>{row.label}</span>
                <span style={{ color: row.color, fontWeight: row.bold ? 800 : 600 }}>
                  {formatCurrency(row.value)}
                </span>
              </div>
            ))}

          {L.body.showBalance && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "4mm",
                padding: "7px 10px",
                marginTop: "6px",
                borderRadius: "4px",
                background: dueAmount > 0 ? SAMPLE.redBg : SAMPLE.paidFullBg,
                color: dueAmount > 0 ? SAMPLE.red : SAMPLE.paidFullText,
                fontWeight: 800,
                fontSize: "10pt",
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              <span>{dueAmount > 0 ? "Balance Due" : "Paid in Full"}</span>
              <span>{formatCurrency(dueAmount)}</span>
            </div>
          )}
        </div>
      </section>
      )}

      {/* IN WORD */}
      {showSection("showInWords") && L.body.showInWords && (
        <div
          className="invoice-print-inwords invoice-keep-together"
          style={{ marginBottom: "4mm", fontSize: "9pt", color: SAMPLE.muted }}
        >
          <span style={{ fontWeight: 700, color: SAMPLE.text }}>In Word : </span>
          <span>{inWords}</span>
        </div>
      )}

      {/* NOTES */}
      {showSection("showNotes") && L.body.showNotes && invoice.notes && (
        <section
          className="invoice-print-notes invoice-keep-together"
          style={{
            border: `1px solid ${SAMPLE.border}`,
            borderRadius: "6px",
            padding: "8px 10px",
            marginBottom: "4mm",
            color: SAMPLE.muted,
            whiteSpace: "pre-line",
            fontSize: "9pt",
          }}
        >
          {invoice.notes}
        </section>
      )}

      {/* PAYMENT HISTORY */}
      {showSection("showPaymentHistory") && L.body.showPaymentHistory && installments.length > 0 && (
        <section
          className="invoice-print-payment-history invoice-keep-together"
          style={{
            border: `1px solid ${SAMPLE.border}`,
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "6mm",
            pageBreakInside: "avoid",
            breakInside: "avoid-page",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: "10pt",
              textTransform: "uppercase",
              marginBottom: "8px",
              color: SAMPLE.blue,
              letterSpacing: "0.3px",
            }}
          >
            PAYMENT HISTORY
          </div>

          {installments.map((inst, idx) => (
            <div
              key={inst.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3mm",
                padding: idx === 0 ? "0" : "7px 0 0",
                marginTop: idx === 0 ? 0 : "7px",
                borderTop: idx === 0 ? "none" : `1px solid ${SAMPLE.border}`,
                fontSize: "9pt",
              }}
            >
              <div
                style={{
                  width: "3px",
                  alignSelf: "stretch",
                  background: SAMPLE.teal,
                  borderRadius: "2px",
                  flexShrink: 0,
                  minHeight: "18px",
                }}
              />
              <span style={{ color: SAMPLE.muted, whiteSpace: "nowrap", flexShrink: 0 }}>
                {formatDate(inst.paid_date)}
              </span>
              <span style={{ flexShrink: 0, lineHeight: 0 }}>
                <InvoicePillBadge
                  label={inst.payment_method || "Cash"}
                  backgroundColor="#e5e7eb"
                  color={SAMPLE.muted}
                  size="sm"
                />
              </span>
              <span style={{ color: SAMPLE.muted, flex: 1 }}>
                — {getOrdinal(idx + 1)} Payment
              </span>
              <span
                style={{
                  fontWeight: 800,
                  color: SAMPLE.teal,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {formatCurrency(inst.amount)}
              </span>
            </div>
          ))}
        </section>
      )}

      {!pdfMode && <div className="invoice-print-spacer" style={{ flex: 1, minHeight: "8mm" }} />}

      {/* FOOTER */}
      {showSection("showFooter") && (
      <footer
        data-pdf-footer
        className="invoice-footer-block invoice-print-footer invoice-keep-together"
        style={{
          borderTop: `1px solid ${SAMPLE.border}`,
          paddingTop: `${L.footer.paddingTop}mm`,
          pageBreakInside: "avoid",
          breakInside: "avoid-page",
        }}
      >
        {L.footer.showSignatures && (
          <div
            className="invoice-print-signatures"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: `${L.footer.signatureGap}mm`,
              marginBottom: "5mm",
            }}
          >
            {[
              { label: L.footer.signatureLabels.received, sig: b.signature_received_by },
              { label: L.footer.signatureLabels.prepared, sig: b.signature_prepared_by },
              { label: L.footer.signatureLabels.authorize, sig: b.signature_authorize_by },
            ].map((entry) => (
              <div key={entry.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    height: `${L.footer.signatureHeight}px`,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  {entry.sig ? (
                    <img
                      src={entry.sig}
                      alt={entry.label}
                      style={{
                        maxHeight: `${L.footer.signatureHeight}px`,
                        maxWidth: "85%",
                        objectFit: "contain",
                      }}
                    />
                  ) : null}
                </div>
                <div
                  style={{
                    borderTop: `1px solid ${SAMPLE.border}`,
                    paddingTop: "5px",
                    fontSize: "9pt",
                    color: SAMPLE.text,
                  }}
                >
                  {entry.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {L.footer.showThankYou && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "4mm",
              fontSize: "9pt",
              color: SAMPLE.muted,
            }}
          >
            {footerThankYou || "Thank you for staying with us."}
          </div>
        )}

        {(L.footer.showAddress || (L.footer.showQR && showQR)) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: L.footer.showQR && showQR ? "1fr 26mm" : "1fr",
              gap: "5mm",
              alignItems: "end",
            }}
          >
            {L.footer.showAddress && (
              <div
                style={{
                  textAlign: "left",
                  color: SAMPLE.muted,
                  fontSize: `${L.footer.fontSize}pt`,
                  lineHeight: 1.5,
                }}
              >
                {addressLine1 && <div>{addressLine1}</div>}
                {addressLine2 && <div>{addressLine2}</div>}
                {L.footer.showContact && (footerPhone || footerEmail) && (
                  <div>{[footerPhone, footerEmail].filter(Boolean).join(" | ")}</div>
                )}
              </div>
            )}

            {L.footer.showQR && showQR && (
              <div style={{ textAlign: "center", justifySelf: "end" }}>
                <InvoiceQRCode invoiceId={invoice.id} size={L.footer.qrSize} showLabel={false} />
                <div style={{ fontSize: "7pt", color: SAMPLE.muted, marginTop: "3px" }}>
                  Scan the QR code for details
                </div>
              </div>
            )}
          </div>
        )}
      </footer>
      )}
    </div>
  );
};
