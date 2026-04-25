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
import { printClientService } from "@/app/(protected)/pos/_services/print-client.service";
import { formatInvoiceNumber } from "@/app/(protected)/pos/_services/print-format.service";

interface ReportInvoicePrintButtonProps {
  invoiceId: string;
  invoiceNumber: number;
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
    });
  };

  const handlePrint = async () => {
    if (!payload) {
      return;
    }

    try {
      const result = await printClientService.print({
        title: `Invoice ${formatInvoiceNumber(payload.invoiceNumber)}`,
        intent: "report-invoice",
        previewContent: payload.previewContent,
        printSegments: payload.printSegments,
        printerConfig: payload.printerConfig,
      }, {
        fallbackToPreview: false,
      });

      if (result.status === "printed") {
        toast.success("Printing in progress...", {
          description: result.message,
        });
        return;
      }

      toast.error(result.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to print invoice.",
      );
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
        Reprint / Preview #{formatInvoiceNumber(invoiceNumber)}
      </Button>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[85vh] rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Invoice #{formatInvoiceNumber(invoiceNumber)}</DialogTitle>
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
            <Button type="button" className="rounded-xl" onClick={() => void handlePrint()} disabled={!payload}>
              <Printer className="size-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
