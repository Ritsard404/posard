"use client";

import { useRef, useState, useTransition } from "react";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import {
  batchUploadProducts,
  getProductImportWorkbookTemplate,
  previewBatchUploadProducts,
} from "@/app/(protected)/product/_actions/product.actions";
import type {
  ProductBatchPreviewDto,
  ProductBatchPreviewRowDto,
} from "@/app/(protected)/product/_services/_dto/product.dto";

interface CsvUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function worksheetToCsv(xmlText: string): string {
  const document = new DOMParser().parseFromString(xmlText, "text/xml");
  const parseError = document.querySelector("parsererror");

  if (parseError) {
    throw new Error("The spreadsheet template could not be read.");
  }

  const worksheets = Array.from(document.getElementsByTagName("Worksheet"));
  const productsSheet =
    worksheets.find(
      (worksheet) =>
        worksheet.getAttribute("ss:Name") === "Products" ||
        worksheet.getAttribute("Name") === "Products",
    ) ?? worksheets[0];

  if (!productsSheet) {
    throw new Error("The spreadsheet does not contain a Products sheet.");
  }

  const rows = Array.from(productsSheet.getElementsByTagName("Row"));

  return rows
    .map((row) => {
      const cells = Array.from(row.getElementsByTagName("Cell"));
      return cells
        .map((cell) => {
          const data = cell.getElementsByTagName("Data")[0];
          return escapeCsvValue(data?.textContent ?? "");
        })
        .join(",");
    })
    .join("\n");
}

function normalizeUploadedText(text: string): string {
  const trimmedStart = text.trimStart();

  if (trimmedStart.startsWith("<?xml") || trimmedStart.startsWith("<Workbook")) {
    return worksheetToCsv(text);
  }

  if (trimmedStart.startsWith("PK")) {
    throw new Error(
      "XLSX files are not supported for upload yet. Export the Products sheet as CSV, or use the downloaded POSARD .xls template.",
    );
  }

  return text;
}

function UploadSummary({
  preview,
}: {
  preview: ProductBatchPreviewDto;
}) {
  const stats = [
    { label: "Rows", value: preview.totalRows },
    { label: "Ready", value: preview.validRowCount },
    { label: "Errors", value: preview.invalidRowCount },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/70 bg-muted/30">
          <CardContent className="p-3">
            <div className="text-lg font-semibold leading-none">{stat.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PreviewRow({ row }: { row: ProductBatchPreviewRowDto }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Row {row.rowNumber}
            </span>
            {row.errors.length > 0 ? (
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                Needs fixes
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                Ready
              </Badge>
            )}
          </div>
          <p className="mt-2 font-medium text-foreground">{row.name || "Missing product name"}</p>
          <p className="text-sm text-muted-foreground">
            {row.categoryName} • {row.baseUnit} • {row.trackInventory ? `${row.quantity ?? 0} in stock` : "Inventory off"}
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">₱ {row.price.toFixed(2)}</div>
          <div className="text-muted-foreground">Cost ₱ {row.cost.toFixed(2)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Type {row.itemType}</span>
        <span>VAT {row.vatType}</span>
        <span>{row.isAvailable ? "Available" : "Unavailable"}</span>
        {row.barcode ? <span>Barcode {row.barcode}</span> : null}
      </div>

      {row.errors.length > 0 ? (
        <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
          {row.errors.join(" ")}
        </div>
      ) : null}
    </div>
  );
}

export function CsvUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: CsvUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [preview, setPreview] = useState<ProductBatchPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isUploadPending, startUploadTransition] = useTransition();

  function resetState() {
    setFileName(null);
    setCsvText("");
    setPreview(null);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetState();
    }
    onOpenChange(next);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);

    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const text = String(loadEvent.target?.result ?? "");
        setCsvText(normalizeUploadedText(text));
        setPreview(null);
      } catch (readError) {
        setCsvText("");
        setPreview(null);
        setError(
          readError instanceof Error
            ? readError.message
            : "The uploaded file could not be read.",
        );
      }
    };
    reader.readAsText(file);
  }

  async function handleDownloadTemplate() {
    const template = await getProductImportWorkbookTemplate();
    const blob = new Blob([template], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "POSARD-Product-Import-Template.xls";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleGeneratePreview() {
    if (!csvText.trim()) {
      setError("Upload a CSV file before generating a preview.");
      return;
    }

    startPreviewTransition(async () => {
      setError(null);
      const result = await previewBatchUploadProducts(csvText);
      if ("error" in result) {
        setPreview(null);
        setError(result.error);
        return;
      }

      setPreview(result);
      if (result.invalidRowCount > 0) {
        toast.error("Preview generated with row errors.");
      } else {
        toast.success("Preview is ready to import.");
      }
    });
  }

  function handleUpload() {
    if (!preview || preview.validRowCount === 0 || preview.invalidRowCount > 0) {
      setError("Fix all preview errors before importing.");
      return;
    }

    startUploadTransition(async () => {
      setError(null);
      const result = await batchUploadProducts(preview.validRows);
      if (result.error) {
        setError(result.error);
        return;
      }

      toast.success(`Imported ${preview.validRowCount} product${preview.validRowCount === 1 ? "" : "s"}.`);
      handleOpenChange(false);
      onSuccess();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-7xl gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
        <div className="flex min-h-0 w-full flex-col">
          <AlertDialogHeader className="shrink-0 space-y-3 border-b px-4 py-4 sm:px-6">
            <AlertDialogTitle className="flex items-center gap-2 text-left">
              <FileSpreadsheet className="size-5" />
              Batch Create Products
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Upload the standardized CSV template, review normalized rows, then confirm the import once every row is valid.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate} className="w-full sm:w-auto">
                <Download className="size-4" />
                Download Template
              </Button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <Upload className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 font-medium">{fileName ?? "Tap to choose a CSV file"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quoted values and commas inside fields are supported.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xml,text/csv,application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleGeneratePreview}
                disabled={!csvText.trim() || isPreviewPending || isUploadPending}
                className="w-full sm:w-auto"
              >
                {isPreviewPending ? <Loader2 className="size-4 animate-spin" /> : <TriangleAlert className="size-4" />}
                Preview Import
              </Button>
              {preview ? <UploadSummary preview={preview} /> : null}
            </div>

            {preview ? (
              <>
                <Separator />
                <ScrollArea className="h-[min(48vh,520px)] pr-4">
                  <div className="space-y-3">
                    {preview.rows.map((row) => (
                      <PreviewRow key={`${row.rowNumber}-${row.name}`} row={row} />
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : null}
            </div>
          </div>

          <AlertDialogFooter className="sticky bottom-0 z-10 shrink-0 border-t bg-background px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] sm:px-6">
            <AlertDialogCancel disabled={isPreviewPending || isUploadPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={
                !preview ||
                preview.validRowCount === 0 ||
                preview.invalidRowCount > 0 ||
                isPreviewPending ||
                isUploadPending
              }
            >
              {isUploadPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Import Products
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
