"use client";

import { useState, useTransition } from "react";
import { Monitor, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getReportInvoicePrintPayloadAction } from "../_actions/report.action";
import type { ReportInvoicePrintPayloadDto } from "../_services/_dto/report.dto";

interface ReportInvoicePrintButtonProps {
  invoiceId: string;
  invoiceNumber: number;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildPrintMarkup(payload: ReportInvoicePrintPayloadDto) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${payload.invoiceNumber}</title>
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

export function ReportInvoicePrintButton({
  invoiceId,
  invoiceNumber,
}: ReportInvoicePrintButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [payload, setPayload] = useState<ReportInvoicePrintPayloadDto | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleOpen = () => {
    startTransition(async () => {
      const result = await getReportInvoicePrintPayloadAction(invoiceId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPayload(result.data);
      setIsPreviewOpen(true);
      toast.info(result.data.message);
    });
  };

  const handlePrint = () => {
    if (!payload) {
      return;
    }

    try {
      const printWindow = window.open("", "_blank", "noopener,noreferrer");

      if (!printWindow) {
        throw new Error("The browser blocked the print window.");
      }

      printWindow.document.open();
      printWindow.document.write(buildPrintMarkup(payload));
      printWindow.document.close();
      toast.success("Printing in progress...");
    } catch {
      toast.error("Unable to open the print window.");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={handleOpen}
        disabled={isPending}
      >
        {isPending ? <Monitor className="size-4" /> : <Printer className="size-4" />}
        Reprint #{invoiceNumber}
      </Button>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[85vh] rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Invoice #{invoiceNumber}</DialogTitle>
            <DialogDescription>{payload?.message ?? "Loading print preview..."}</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <pre className="max-h-[58vh] overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-foreground">
              {payload?.previewContent ?? ""}
            </pre>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            <Button type="button" className="rounded-xl" onClick={handlePrint} disabled={!payload}>
              <Printer className="size-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
