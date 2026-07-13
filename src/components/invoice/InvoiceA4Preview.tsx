import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ThemedInvoiceDocument } from "@/components/invoice/ThemedInvoiceDocument";
import { cn } from "@/lib/utils";

type ThemedInvoiceDocumentProps = Parameters<typeof ThemedInvoiceDocument>[0];

interface InvoiceA4PreviewProps extends ThemedInvoiceDocumentProps {
  className?: string;
  sheetClassName?: string;
}

/** Approximate CSS px for 210mm / 297mm at 96dpi */
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

/**
 * Scales a true A4 invoice sheet to fit the viewport width.
 * Does NOT use invoice-print-area — keep print/PDF hosts separate.
 */
export function InvoiceA4Preview({
  className,
  sheetClassName,
  ...documentProps
}: InvoiceA4PreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(A4_HEIGHT_PX);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      const availableWidth = Math.max(280, viewport.clientWidth);
      setScale(Math.min(1, availableWidth / A4_WIDTH_PX));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const measure = () => {
      const nextHeight = sheet.scrollHeight || A4_HEIGHT_PX;
      setSheetHeight(Math.max(A4_HEIGHT_PX, nextHeight));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [documentProps.invoice, documentProps.items, documentProps.installments, documentProps.theme, documentProps.layout]);

  return (
    <div ref={viewportRef} className={cn("invoice-a4-scaled w-full overflow-x-hidden", className)}>
      <div
        className="mx-auto"
        style={{
          width: `${A4_WIDTH_PX * scale}px`,
          height: `${sheetHeight * scale}px`,
        }}
      >
        <div
          ref={sheetRef}
          className={cn("invoice-screen-preview bg-white shadow-lg rounded-lg", sheetClassName)}
          style={
            {
              width: A4_WIDTH_PX,
              minHeight: A4_HEIGHT_PX,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            } as CSSProperties
          }
        >
          <ThemedInvoiceDocument {...documentProps} />
        </div>
      </div>
    </div>
  );
}
