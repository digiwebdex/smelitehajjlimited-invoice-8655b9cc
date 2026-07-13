/**
 * Print an invoice DOM node via a hidden iframe.
 * This guarantees the app shell never interferes with print pagination,
 * and the browser paginates the item table naturally.
 */
export function printInvoiceFromNode(node: HTMLElement): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return;
  }

  // Copy parent stylesheets so colors / fonts match the on-screen view.
  const styleNodes = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style')
  )
    .map((n) => n.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    ${styleNodes}
    <style>
      @page { size: A4 portrait; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        width: 210mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body * { visibility: visible !important; }
      .invoice-print-area {
        position: static !important;
        width: 210mm !important;
        min-height: 297mm !important;
        max-width: 210mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        transform: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      .invoice-print-area .invoice-document {
        width: 210mm !important;
        min-height: 297mm !important;
        max-width: 210mm !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        transform: none !important;
        box-sizing: border-box !important;
        padding-bottom: 16mm !important;
      }
      .invoice-items tr,
      .invoice-row,
      .invoice-keep-together,
      .invoice-footer-block {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .invoice-items thead { display: table-header-group !important; }
      .invoice-footer-block { margin-top: 0 !important; }
    </style>
  </head>
  <body>
    <div class="invoice-print-area">${node.innerHTML}</div>
  </body>
</html>`);
  doc.close();

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } finally {
      // Allow Chrome to finish handing the print dialog the data.
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    }
  };

  // Wait for images / fonts inside the iframe to settle.
  if (doc.readyState === "complete") {
    setTimeout(triggerPrint, 200);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 200);
  }
}
