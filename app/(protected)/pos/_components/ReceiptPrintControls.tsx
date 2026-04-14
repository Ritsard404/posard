"use client";

import { useMemo, useState } from "react";
import { Monitor, Printer, ScanText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReceiptPrintPayloadDto } from "../_services/receipt-print.service";

interface ReceiptPrintControlsProps {
  payload: ReceiptPrintPayloadDto;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildPrintMarkup(payload: ReceiptPrintPayloadDto) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Receipt</title>
    <style>
      body { margin: 0; padding: 16px; font-family: "Courier New", monospace; color: #111827; }
      pre { margin: 0; white-space: pre-wrap; font-size: 12px; line-height: 1.35; }
      @page { margin: 8mm; }
    </style>
  </head>
  <body>
    <pre>${escapeHtml(payload.previewContent)}</pre>
    <script>window.onload=function(){window.print();};</script>
  </body>
</html>`;
}

export function ReceiptPrintControls({ payload }: ReceiptPrintControlsProps) {
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const printerStatusLabel = useMemo(
    () => (payload.printerAvailable ? "Printer ready" : "Preview fallback"),
    [payload.printerAvailable],
  );

  const openPreview = (description?: string) => {
    setIsPreviewOpen(true);

    if (description) {
      toast.info(description);
    }
  };

  const handlePrimary = () => {
    if (!payload.printerAvailable) {
      openPreview(payload.message);
      return;
    }

    setIsChoiceOpen(true);
  };

  const handlePrint = () => {
    try {
      const printWindow = window.open("", "_blank", "noopener,noreferrer");

      if (!printWindow) {
        throw new Error("The browser blocked the print window.");
      }

      printWindow.document.open();
      printWindow.document.write(buildPrintMarkup(payload));
      printWindow.document.close();
      setIsChoiceOpen(false);
      toast.success("Printing in progress...", {
        description: payload.printerName
          ? `Configured printer: ${payload.printerName}`
          : "Use the browser print dialog to continue.",
      });
    } catch {
      setIsChoiceOpen(false);
      openPreview("Printing failed. Showing printable preview instead.");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Badge
          variant={payload.printerAvailable ? "secondary" : "outline"}
          className="rounded-full px-3 py-1"
        >
          {printerStatusLabel}
        </Badge>
        <Button type="button" variant="outline" className="rounded-xl" onClick={handlePrimary}>
          {payload.printerAvailable ? <Printer className="size-4" /> : <Monitor className="size-4" />}
          {payload.printerAvailable ? "Print / Preview" : "Preview Receipt"}
        </Button>
      </div>

      <Dialog open={isChoiceOpen} onOpenChange={setIsChoiceOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Receipt Output</DialogTitle>
            <DialogDescription>{payload.message}</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            Printer: {payload.printerName ?? "Not configured"}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setIsChoiceOpen(false);
                openPreview();
              }}
            >
              <ScanText className="size-4" />
              Preview on Screen
            </Button>
            <Button type="button" className="rounded-xl" onClick={handlePrint}>
              <Printer className="size-4" />
              Print Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[85vh] rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
            <DialogDescription>Thermal layout based on the invoice printer format.</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <pre className="max-h-[58vh] overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-foreground">
              {payload.previewContent}
            </pre>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            <Button type="button" className="rounded-xl" onClick={handlePrint}>
              <Printer className="size-4" />
              Print from Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
