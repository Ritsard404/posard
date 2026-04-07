"use client";

import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  batchUploadProducts,
  getProductCsvTemplate,
} from "@/app/(protected)/inventory/_actions/product.actions";

// ─────────────────────────────────────────────
// Props del diálogo de carga CSV
// ─────────────────────────────────────────────

interface CsvUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────
// Diálogo para subir productos en lote via CSV
// ─────────────────────────────────────────────

export function CsvUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: CsvUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limpiar estado al abrir/cerrar
  function handleOpenChange(next: boolean) {
    if (!next) {
      setFileName(null);
      setCsvText(null);
      setPreviewRows([]);
      setError(null);
    }
    onOpenChange(next);
  }

  // Leer el archivo CSV seleccionado
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);

      // Generar previsualización de las primeras 5 filas de datos
      const lines = text
        .split("\n")
        .filter((l) => l.trim().length > 0);
      const rows = lines.slice(0, 6).map((l) => l.split(","));
      setPreviewRows(rows);
    };
    reader.readAsText(file);
  }

  // Descargar la plantilla CSV
  async function handleDownloadTemplate() {
    const template = await getProductCsvTemplate();
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Enviar el CSV al servidor
  async function handleUpload() {
    if (!csvText) return;
    setIsUploading(true);
    setError(null);

    const result = await batchUploadProducts(csvText);

    if (result.error) {
      setError(result.error);
      setIsUploading(false);
      return;
    }

    setIsUploading(false);
    handleOpenChange(false);
    onSuccess();
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Bulk Upload Products
          </AlertDialogTitle>
          <AlertDialogDescription>
            Upload a CSV file to create multiple products at once.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          {/* Error */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Descargar plantilla */}
          <Button
            id="btn-download-csv-template"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="w-fit"
          >
            <Download className="size-4" />
            Download Template
          </Button>

          {/* Zona de carga de archivo */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <Upload className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">
              {fileName ?? "Click to select a CSV file"}
            </p>
            <p className="text-xs text-muted-foreground">
              Columns: Product Name, Category Name, Price, Quantity, Cost, Base
              Unit
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Previsualización de datos */}
          {previewRows.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      className={
                        i === 0
                          ? "bg-muted/50 font-medium"
                          : "border-t border-border"
                      }
                    >
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1.5 whitespace-nowrap">
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 5 && (
                <p className="px-2 py-1 text-[10px] text-muted-foreground">
                  Showing first 5 data rows...
                </p>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUploading}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleUpload}
            disabled={!csvText || isUploading}
          >
            {isUploading && <Loader2 className="size-4 animate-spin" />}
            Upload Products
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
