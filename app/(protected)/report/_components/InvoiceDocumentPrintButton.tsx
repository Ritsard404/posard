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
import {
  getInvoiceDocumentPrintPayloadAction,
  reprintInvoiceDocumentAction,
} from "../_actions/report.action";
import type {
  InvoiceDocumentItemDto,
  InvoiceDocumentPrintPayloadDto,
} from "../_services/_dto/report.dto";
import { printClientService } from "@/app/(protected)/pos/_services/print-client.service";

interface InvoiceDocumentPrintButtonProps {
  documentId: string;
  type: InvoiceDocumentItemDto["type"];
}

export function InvoiceDocumentPrintButton({
  documentId,
  type,
}: InvoiceDocumentPrintButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [payload, setPayload] = useState<InvoiceDocumentPrintPayloadDto | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreview = () => {
    startTransition(async () => {
      const result = await getInvoiceDocumentPrintPayloadAction(documentId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPayload(result.data);
      setIsPreviewOpen(true);
    });
  };

  const handleReprint = () => {
    startTransition(async () => {
      const result = await reprintInvoiceDocumentAction({ documentId, type });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPayload(result.data);
      setIsPreviewOpen(true);
      toast.success("Document reprint prepared", {
        description: `Reprints: ${result.data.reprintCount}`,
      });
    });
  };

  const handlePrint = async () => {
    if (!payload) {
      return;
    }

    try {
      const result = await printClientService.print(
        {
          title: payload.title,
          intent: "report-invoice",
          previewContent: payload.previewContent,
          printSegments: payload.printSegments,
          printerConfig: payload.printerConfig,
        },
        {
          fallbackToPreview: false,
        },
      );

      if (result.status === "printed") {
        toast.success("Printing in progress...", {
          description: result.message,
        });
        return;
      }

      toast.error(result.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to print invoice document.",
      );
    }
  };

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-lg px-2.5"
          onClick={handlePreview}
          disabled={isPending}
        >
          <Monitor className="size-4" />
          View
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-lg px-2.5"
          onClick={handleReprint}
          disabled={isPending}
        >
          <Printer className="size-4" />
          Reprint
        </Button>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[85vh] rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{payload?.title ?? "Invoice Document"}</DialogTitle>
            <DialogDescription>
              {payload ? `Reprints: ${payload.reprintCount}` : "Loading document preview..."}
            </DialogDescription>
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
