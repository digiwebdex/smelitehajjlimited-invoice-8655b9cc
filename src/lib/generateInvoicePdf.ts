import jsPDF from "jspdf";
import QRCode from "qrcode";
import { Invoice, Company } from "@/types";
import { ThemeSettings, defaultTheme, hexToRgb } from "@/types/theme";
import { BrandSettings, defaultBranding } from "@/types/branding";
import { numberToWords } from "@/lib/numberToWords";
import { getInvoiceFooterDetails } from "@/lib/invoiceFooter";

const getOrdinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatCurrency = (amount: number): string => {
  return `Tk ${new Intl.NumberFormat("en-BD", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

const formatDate = (date: Date | undefined): string => {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getImageFormat = (imageData: string): "PNG" | "JPEG" => {
  const normalized = imageData.toLowerCase();
  return normalized.includes("image/jpeg") || normalized.includes("image/jpg") ? "JPEG" : "PNG";
};

export const generateInvoicePdf = async (
  invoice: Invoice,
  company?: Company,
  theme?: ThemeSettings,
  branding?: BrandSettings | null
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const t = theme || defaultTheme;
  const b = branding || defaultBranding;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const footerMargin = 15;

  const primaryColor = hexToRgb(t.primary_color);
  const accentColor = hexToRgb(t.accent_color);
  const mutedColor = hexToRgb(t.subtotal_text_color);
  const textColor = hexToRgb(t.header_text_color);
  const paidTextColor = hexToRgb(t.paid_text_color);
  const redColor = hexToRgb(t.badge_unpaid_color);
  const orangeColor: [number, number, number] = [249, 115, 22];
  const borderColor = hexToRgb(t.border_color);
  const footerTextColor = hexToRgb(t.footer_text_color);
  const balanceBgColor = hexToRgb(t.balance_bg_color);
  const balanceTextColor = hexToRgb(t.balance_text_color);

  const headerName = company?.name || b.company_name || "Company Name";
  const headerTagline = company?.tagline || b.tagline;
  const headerLogo = company?.logo_url || b.company_logo;
  const {
    footerLines,
    footerThankYou: thankYouText,
    footerWebsite,
    showQR: showQRCode,
  } = getInvoiceFooterDetails(company, branding);

  const signatureImages = [b.signature_received_by, b.signature_prepared_by, b.signature_authorize_by];
  const hasAnySignature = signatureImages.some(Boolean);
  const signatureBlockHeight = hasAnySignature ? 22 : 14;
  const footerContentHeight = Math.max(footerLines.length * 3.6, showQRCode ? 28 : 0);
  const footerBlockHeight = 12 + footerContentHeight;
  const finalBlockHeight = signatureBlockHeight + footerBlockHeight + 10;

  const statusColors: Record<string, [number, number, number]> = {
    paid: [22, 163, 74],
    partial: [202, 138, 4],
    unpaid: [220, 38, 38],
  };
  const statusBgColors: Record<string, [number, number, number]> = {
    paid: [220, 252, 231],
    partial: [254, 249, 195],
    unpaid: [254, 226, 226],
  };

  let yPos = margin;

  const drawContinuationHeader = () => {
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(headerName, margin, yPos + 4);

    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice ${invoice.invoiceNumber} (continued)`, pageWidth - margin, yPos + 4, { align: "right" });

    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos + 8, pageWidth - margin, yPos + 8);
    yPos += 12;
  };

  const addContinuationPage = () => {
    doc.addPage();
    yPos = margin;
    drawContinuationHeader();
  };

  const ensureSpace = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      addContinuationPage();
    }
  };

  const logoSize = 18;
  const logoCenterX = margin + logoSize / 2;
  const logoCenterY = yPos + logoSize / 2;
  let logoDrawn = false;

  const drawCircularLogo = (imageData: string) => {
    doc.setFillColor(255, 255, 255);
    doc.circle(logoCenterX, logoCenterY, logoSize / 2, "F");

    const imageSize = logoSize * 0.7;
    const imageOffset = (logoSize - imageSize) / 2;
    doc.addImage(imageData, getImageFormat(imageData), margin + imageOffset, yPos + imageOffset, imageSize, imageSize);

    doc.setFillColor(255, 255, 255);
    doc.rect(margin, yPos, imageOffset, imageOffset, "F");
    doc.rect(margin + logoSize - imageOffset, yPos, imageOffset, imageOffset, "F");
    doc.rect(margin, yPos + logoSize - imageOffset, imageOffset, imageOffset, "F");
    doc.rect(margin + logoSize - imageOffset, yPos + logoSize - imageOffset, imageOffset, imageOffset, "F");

    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.6);
    doc.circle(logoCenterX, logoCenterY, logoSize / 2, "S");
  };

  if (headerLogo) {
    try {
      if (headerLogo.startsWith("http://") || headerLogo.startsWith("https://")) {
        try {
          const response = await fetch(headerLogo);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          drawCircularLogo(dataUrl);
          logoDrawn = true;
        } catch (e) {
          console.error("Failed to fetch logo:", e);
        }
      } else if (headerLogo.startsWith("data:image")) {
        drawCircularLogo(headerLogo);
        logoDrawn = true;
      }
    } catch (e) {
      console.error("Failed to add logo:", e);
    }
  }

  if (!logoDrawn) {
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.circle(logoCenterX, logoCenterY, logoSize / 2, "S");

    doc.setFillColor(...primaryColor);
    doc.circle(logoCenterX, logoCenterY, logoSize / 2 - 0.6, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(headerName?.charAt(0) || "C", logoCenterX, logoCenterY + 3.5, { align: "center" });
  }

  const companyInfoX = margin + logoSize + 4;
  doc.setTextColor(...primaryColor);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(headerName, companyInfoX, yPos + 6);

  if (headerTagline) {
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(headerTagline, companyInfoX, yPos + 11);
  }

  doc.setTextColor(...primaryColor);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - margin, yPos + 6, { align: "right" });

  doc.setTextColor(...orangeColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.invoiceNumber, pageWidth - margin, yPos + 13, { align: "right" });

  const statusColor = statusColors[invoice.status] || statusColors.unpaid;
  const statusBgColor = statusBgColors[invoice.status] || statusBgColors.unpaid;
  const statusText = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
  const statusWidth = doc.getTextWidth(statusText) + 8;

  doc.setFillColor(...statusBgColor);
  doc.roundedRect(pageWidth - margin - statusWidth, yPos + 16, statusWidth, 6, 3, 3, "F");
  doc.setTextColor(...statusColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, pageWidth - margin - statusWidth / 2, yPos + 20.5, { align: "center" });

  yPos += 22;

  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  let billToHeight = 20;
  if (invoice.clientEmail) billToHeight += 4;
  if (invoice.clientPhone) billToHeight += 4;
  if (invoice.clientAddress) billToHeight += 4;

  doc.setFillColor(...accentColor);
  doc.rect(margin, yPos, 1.5, billToHeight, "F");

  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("BILL TO", margin + 5, yPos + 4);
  doc.text("INVOICE DATE :", pageWidth - margin - 48, yPos + 4);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(invoice.date), pageWidth - margin, yPos + 4, { align: "right" });

  yPos += 8;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.clientName, margin + 5, yPos + 1);

  yPos += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);

  if (invoice.clientEmail) {
    doc.text(invoice.clientEmail, margin + 5, yPos);
    yPos += 4;
  }

  if (invoice.clientPhone) {
    doc.text(invoice.clientPhone, margin + 5, yPos);
    yPos += 4;
  }

  if (invoice.clientAddress) {
    const addressLines = doc.splitTextToSize(invoice.clientAddress, 90);
    doc.text(addressLines, margin + 5, yPos);
    yPos += addressLines.length * 4;
  }

  yPos += 10;

  const tableX = margin;
  const descColWidth = contentWidth * 0.5;
  const qtyColWidth = contentWidth * 0.1;
  const unitColWidth = contentWidth * 0.2;

  const descX = tableX;
  const qtyX = tableX + descColWidth;
  const unitX = tableX + descColWidth + qtyColWidth;
  const totalRightX = tableX + contentWidth;

  const drawItemsTableHeader = () => {
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPTION", descX, yPos);
    doc.text("QTY", qtyX, yPos);
    doc.text("UNIT PRICE", unitX, yPos);
    doc.text("TOTAL", totalRightX, yPos, { align: "right" });

    yPos += 3;
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.5);
    doc.line(tableX, yPos, tableX + contentWidth, yPos);
    yPos += 2;
  };

  drawItemsTableHeader();

  const lineHeight = 4.2;
  const minRowHeight = 7;
  invoice.items.forEach((item) => {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const title = item.title || "—";
    const titleLines = doc.splitTextToSize(title, descColWidth - 2);
    const textBlockHeight = titleLines.length * lineHeight;
    const totalRowHeight = Math.max(textBlockHeight + 2.8, minRowHeight);

    if (yPos + totalRowHeight + 2 > pageHeight - margin) {
      addContinuationPage();
      drawItemsTableHeader();
    }

    const rowTopY = yPos;
    const yCenter = rowTopY + totalRowHeight / 2 + 0.8;
    const descStartY = rowTopY + (totalRowHeight - textBlockHeight) / 2 + lineHeight * 0.7;

    doc.text(titleLines, descX, descStartY);
    doc.text((item.qty || 1).toString(), qtyX, yCenter);
    doc.text(formatCurrency(item.unitPrice || item.amount), unitX, yCenter);

    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(item.amount), totalRightX, yCenter, { align: "right" });

    yPos = rowTopY + totalRowHeight;
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.2);
    doc.line(tableX, yPos, tableX + contentWidth, yPos);
    yPos += 2;
  });

  yPos += 2;

  const summaryX = pageWidth - margin - 75;
  const summaryWidth = 75;
  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  const vatRate = invoice.vatRate || 0;
  const vatAmount = invoice.vatAmount || (subtotal * vatRate) / 100;
  const totalWithVat = subtotal + vatAmount;
  const inWordAmount = invoice.dueAmount > 0 ? invoice.dueAmount : totalWithVat;
  const inWordLabel = "In Word : ";

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const inWordLabelWidth = doc.getTextWidth(inWordLabel);
  doc.setFont("helvetica", "normal");
  const inWordText = numberToWords(inWordAmount) + " Taka Only";
  const inWordLines = doc.splitTextToSize(inWordText, summaryWidth - inWordLabelWidth - 2);
  const summaryHeight = 56 + Math.max(0, inWordLines.length - 1) * 3.5;

  ensureSpace(summaryHeight);

  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", summaryX, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(subtotal), pageWidth - margin, yPos, { align: "right" });

  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.2);
  doc.line(summaryX, yPos + 3, pageWidth - margin, yPos + 3);
  yPos += 9;

  doc.setTextColor(...mutedColor);
  doc.setFont("helvetica", "normal");
  doc.text("VAT", summaryX, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(vatAmount), pageWidth - margin, yPos, { align: "right" });

  doc.line(summaryX, yPos + 3, pageWidth - margin, yPos + 3);
  yPos += 9;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Total", summaryX, yPos);
  doc.text(formatCurrency(totalWithVat), pageWidth - margin, yPos, { align: "right" });

  doc.line(summaryX, yPos + 3, pageWidth - margin, yPos + 3);
  yPos += 9;

  doc.setFontSize(9);
  doc.setTextColor(...paidTextColor);
  doc.setFont("helvetica", "bold");
  doc.text("Total Paid", summaryX, yPos);
  doc.text(formatCurrency(invoice.paidAmount), pageWidth - margin, yPos, { align: "right" });

  doc.line(summaryX, yPos + 3, pageWidth - margin, yPos + 3);
  yPos += 9;

  const balanceBoxBg = invoice.dueAmount > 0 ? redColor : balanceBgColor;
  doc.setFillColor(...balanceBoxBg);
  doc.rect(summaryX, yPos - 3, summaryWidth, 9, "F");

  doc.setTextColor(...balanceTextColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.dueAmount > 0 ? "Balance" : "Paid in Full", summaryX + 3, yPos + 2);
  doc.text(formatCurrency(invoice.dueAmount), pageWidth - margin - 3, yPos + 2, { align: "right" });

  yPos += 10;

  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.setFont("helvetica", "bold");
  doc.text(inWordLabel, summaryX, yPos);
  doc.setFont("helvetica", "normal");
  if (inWordLines.length === 1) {
    doc.text(inWordLines[0], summaryX + inWordLabelWidth, yPos);
  } else {
    doc.text(inWordLines[0], summaryX + inWordLabelWidth, yPos);
    for (let i = 1; i < inWordLines.length; i++) {
      yPos += 3.5;
      doc.text(inWordLines[i], summaryX, yPos);
    }
  }

  yPos += 10;

  if (invoice.notes) {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);

    const notesLines = doc.splitTextToSize(invoice.notes, contentWidth - 10);
    const notesBoxHeight = 10 + notesLines.length * 4;
    ensureSpace(notesBoxHeight + 6);

    doc.roundedRect(margin, yPos, contentWidth, notesBoxHeight, 2, 2, "S");
    yPos += 6;

    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("NOTES / PAYMENT TERMS", margin + 5, yPos);
    yPos += 6;

    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.setFont("helvetica", "normal");
    doc.text(notesLines, margin + 5, yPos);
    yPos += notesLines.length * 4 + 4;
  }

  if (invoice.installments.length > 0) {
    const historyEntryHeight = 12;
    const historyBlockPadding = 16;
    let installmentIndex = 0;

    while (installmentIndex < invoice.installments.length) {
      ensureSpace(historyBlockPadding + historyEntryHeight);

      const availableHeight = pageHeight - margin - yPos;
      const availableEntries = Math.max(1, Math.floor((availableHeight - historyBlockPadding) / historyEntryHeight));
      const pageInstallments = invoice.installments.slice(installmentIndex, installmentIndex + availableEntries);
      const historyBoxHeight = 10 + pageInstallments.length * historyEntryHeight;

      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, yPos, contentWidth, historyBoxHeight, 2, 2, "S");
      yPos += 6;

      doc.setTextColor(...textColor);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT HISTORY", margin + 5, yPos);
      yPos += 6;

      pageInstallments.forEach((inst, idx) => {
        const paymentIndex = installmentIndex + idx;

        doc.setFillColor(209, 213, 219);
        doc.rect(margin + 5, yPos, 1.5, 8, "F");

        doc.setFontSize(8);
        doc.setTextColor(...textColor);
        doc.setFont("helvetica", "normal");
        doc.text(formatDate(inst.paidDate), margin + 10, yPos + 5);

        const methodText = inst.paymentMethod || "Bank Transfer";
        const methodWidth = Math.max(doc.getTextWidth(methodText) + 4, 22);
        doc.setFillColor(156, 163, 175);
        doc.roundedRect(margin + 50, yPos + 1, methodWidth, 5, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.text(methodText, margin + 50 + methodWidth / 2, yPos + 4.5, { align: "center" });

        doc.setTextColor(...mutedColor);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(`— ${getOrdinal(paymentIndex + 1)} Payment`, margin + 50 + methodWidth + 3, yPos + 5);

        doc.setTextColor(...accentColor);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(inst.amount), pageWidth - margin - 5, yPos + 5, { align: "right" });

        yPos += historyEntryHeight;
      });

      yPos += 4;
      installmentIndex += pageInstallments.length;
    }
  }

  ensureSpace(finalBlockHeight);

  const finalBlockStartY = Math.max(yPos + 4, pageHeight - margin - finalBlockHeight);
  const signLineWidth = 40;
  const signXPositions = [margin, pageWidth / 2 - signLineWidth / 2, pageWidth - margin - signLineWidth];
  const labelXPositions = [signXPositions[0] + signLineWidth / 2, pageWidth / 2, signXPositions[2] + signLineWidth / 2];
  const signatureLineY = finalBlockStartY + (hasAnySignature ? 14 : 8);

  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);

  for (let i = 0; i < 3; i++) {
    const sigImg = signatureImages[i];
    if (sigImg) {
      try {
        doc.addImage(sigImg, getImageFormat(sigImg), signXPositions[i] + 5, signatureLineY - 11, 30, 9);
      } catch (e) {
        console.error("Failed to add signature image:", e);
      }
    }
    doc.line(signXPositions[i], signatureLineY, signXPositions[i] + signLineWidth, signatureLineY);
  }

  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.setFont("helvetica", "normal");
  ["Received by", "Prepared by", "Authorize by"].forEach((label, index) => {
    doc.text(label, labelXPositions[index], signatureLineY + 5, { align: "center" });
  });

  const footerTopY = finalBlockStartY + signatureBlockHeight;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(footerMargin, footerTopY, pageWidth - footerMargin, footerTopY);

  doc.setTextColor(...footerTextColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(thankYouText, pageWidth / 2, footerTopY + 5, { align: "center" });

  let footerTextY = footerTopY + 11;
  doc.setFontSize(7.5);
  footerLines.forEach((line, index) => {
    const isWebsiteLine = index === footerLines.length - 1 && footerWebsite;
    if (isWebsiteLine) {
      doc.setTextColor(...primaryColor);
      doc.setFont("helvetica", "bold");
      const label = "Website : ";
      const labelWidth = doc.getTextWidth(label);
      doc.text(label, footerMargin, footerTextY);
      doc.setFont("helvetica", "normal");
      doc.text(line, footerMargin + labelWidth, footerTextY);
    } else {
      doc.setTextColor(...footerTextColor);
      doc.text(line, footerMargin, footerTextY);
    }
    footerTextY += 3.5;
  });

  if (showQRCode) {
    const qrSize = 20;
    const invoiceUrl = `${window.location.origin}/view/${invoice.id}`;
    const qrX = pageWidth - footerMargin - qrSize;
    const qrY = footerTopY + 9;

    try {
      const qrDataUrl = await QRCode.toDataURL(invoiceUrl, {
        width: 110,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      doc.setFontSize(6.5);
      doc.setTextColor(...footerTextColor);
      doc.text("Scan the QR code for details", qrX + qrSize / 2, qrY + qrSize + 3, { align: "center" });
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  }

  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
};
