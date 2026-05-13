"use client";

import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { BarcodeSvg } from "@/components/barcode/BarcodeSvg";
import type { BarcodeLabelProductDto } from "../../_services/_dto/product.dto";

interface BarcodeLabelPrintClientProps {
  products: BarcodeLabelProductDto[];
}

function currency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

export function BarcodeLabelPrintClient({ products }: BarcodeLabelPrintClientProps) {
  const [showPrice, setShowPrice] = useState(true);
  const [copies, setCopies] = useState(1);
  const labels = useMemo(
    () =>
      products.flatMap((product) =>
        Array.from({ length: Math.max(1, Math.min(20, copies)) }, () => product),
      ),
    [copies, products],
  );

  function handleDownloadCsv() {
    const rows = [
      ["Product", "Barcode", "Price", "Category"],
      ...products.map((product) => [
        product.name,
        product.barcode,
        String(product.price),
        product.categoryName ?? "",
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "posard-barcode-labels.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="print:hidden sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold">Barcode Labels</h1>
            <p className="text-sm text-muted-foreground">
              {products.length} products, {labels.length} labels. Large jobs are capped per print segment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium">
              <Checkbox checked={showPrice} onCheckedChange={(checked) => setShowPrice(checked === true)} />
              Price
            </label>
            <Input
              type="number"
              min={1}
              max={20}
              value={copies}
              onChange={(event) => setCopies(Number(event.target.value) || 1)}
              className="h-10 w-24"
              aria-label="Copies per product"
            />
            <Button variant="outline" onClick={handleDownloadCsv}>
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="size-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl p-4 print:max-w-none print:p-0">
        {labels.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No products with barcodes are available for this label sheet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-0">
            {labels.map((product, index) => (
              <div
                key={`${product.id}-${index}`}
                className="break-inside-avoid rounded-md border border-border bg-white p-2 text-black print:h-[1.15in] print:rounded-none print:border-black/60"
              >
                <p className="truncate text-[11px] font-bold leading-tight">{product.name}</p>
                {showPrice ? (
                  <p className="text-[10px] font-semibold leading-tight">{currency(product.price)}</p>
                ) : null}
                <BarcodeSvg value={product.barcode} className="mt-1 h-12 w-full" />
                <p className="truncate text-center text-[10px] font-semibold tracking-wide">
                  {product.barcode}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
