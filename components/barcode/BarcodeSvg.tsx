"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeSvgProps {
  value: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
  className?: string;
}

export function BarcodeSvg({
  value,
  height = 48,
  width = 1.4,
  displayValue = false,
  className,
}: BarcodeSvgProps) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    try {
      setFailed(false);
      JsBarcode(ref.current, value, {
        format: "CODE128",
        height,
        width,
        displayValue,
        margin: 0,
      });
    } catch {
      setFailed(true);
    }
  }, [displayValue, height, value, width]);

  if (failed) {
    return (
      <div className={className}>
        <span className="text-xs font-semibold text-destructive">Invalid barcode</span>
      </div>
    );
  }

  return <svg ref={ref} role="img" aria-label={`Barcode ${value}`} className={className} />;
}
