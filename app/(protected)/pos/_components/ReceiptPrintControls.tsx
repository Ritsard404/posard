"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bluetooth, Cable, Monitor, Printer, ScanSearch, Smartphone, Usb } from "lucide-react";
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
import { saveSessionPrinterConfigAction } from "../_actions/pos.action";
import { usePOSStore } from "../_store/pos-store";
import type {
  PrintJobDto,
  PrinterCapabilityDto,
  PrinterConfigDto,
} from "../_services/_dto/print.dto";
import { printClientService } from "../_services/print-client.service";
import { getPrinterModeLabel } from "../_services/printer-mode.service";
import type { ReceiptPrintPayloadDto } from "../_services/receipt-print.service";
import { printReceipt } from "@/src/lib/capacitor/printer-bridge";

interface ReceiptPrintControlsProps {
  payload: ReceiptPrintPayloadDto;
}

function buildJob(
  payload: ReceiptPrintPayloadDto,
  printerConfig: PrinterConfigDto | null,
): PrintJobDto {
  return {
    title: "Receipt",
    intent: "receipt",
    previewContent: payload.previewContent,
    printSegments: payload.printSegments,
    printerConfig,
  };
}

export function ReceiptPrintControls({ payload }: ReceiptPrintControlsProps) {
  const activeTimestampId = usePOSStore((state) => state.activeTimestampId);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfigDto | null>(
    payload.printerConfig,
  );
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoPrintKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setPrinterConfig(payload.printerConfig);
  }, [payload.printerConfig]);

  const job = useMemo(
    () => buildJob(payload, printerConfig),
    [payload, printerConfig],
  );
  const printerStatus = useMemo(
    () => printClientService.getStatus(printerConfig),
    [printerConfig],
  );
  const printerCapabilities = useMemo(
    () => printClientService.getCapabilities(),
    [],
  );
  const printerName = printerConfig?.displayName ?? payload.printerName ?? null;
  const hasAssignedPrinter = Boolean(printerConfig?.mode);

  useEffect(() => {
    const autoPrintKey = `${payload.previewContent}:${printerConfig?.displayName ?? "none"}`;

    if (
      autoPrintKeyRef.current === autoPrintKey ||
      !printerConfig?.autoPrintEnabled ||
      !printerConfig?.mode
    ) {
      return;
    }

    autoPrintKeyRef.current = autoPrintKey;

    void (async () => {
      try {
        const result = await printReceipt(payload, {
          printerConfig,
          fallbackToPreview: false,
        });
        if (result.status === "printed") {
          toast.success("Receipt sent to printer.", {
            description: result.message,
          });
          return;
        }

        if (result.status !== "unsupported") {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to print receipt.",
        );
      }
    })();
  }, [job, payload, payload.previewContent, printerConfig]);

  const openPreview = () => {
    setIsPreviewOpen(true);
  };

  const handlePrint = async () => {
    try {
      const result = await printReceipt(payload, {
        printerConfig,
        fallbackToPreview: false,
      });
      setIsChoiceOpen(false);

      if (result.status === "printed") {
        toast.success("Printing in progress...", {
          description: result.message,
        });
        return;
      }

      toast.error(result.message);
    } catch (error) {
      setIsChoiceOpen(false);
      toast.error(
        error instanceof Error ? error.message : "Printing failed.",
      );
    }
  };

  const handlePair = async (capability: PrinterCapabilityDto) => {
    if (!activeTimestampId) {
      toast.error("Open a POS session before pairing a printer.");
      return;
    }

    if (!capability.supported) {
      toast.error(capability.reason ?? "This printer mode is not available.");
      return;
    }

    setIsSaving(true);

    try {
      const paired = await printClientService.pair(capability.mode);
      const nextConfig: PrinterConfigDto = {
        displayName: paired.displayName,
        mode: paired.mode,
        transport: paired.transport,
        driver: paired.driver,
        connectionType: paired.connectionType,
        vendorId: paired.vendorId,
        productId: paired.productId,
        deviceId: paired.deviceId,
        serviceUuid: paired.serviceUuid,
        characteristicUuid: paired.characteristicUuid,
        autoPrintEnabled: true,
      };
      const result = await saveSessionPrinterConfigAction(
        activeTimestampId,
        nextConfig,
      );

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPrinterConfig(nextConfig);
      toast.success("Printer paired and test printed.", {
        description: `${paired.displayName} is ready on this terminal.`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to pair printer.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {hasAssignedPrinter ? (
          <Badge
            variant={printerStatus.tone === "ready" ? "secondary" : "outline"}
            className="rounded-full px-3 py-1"
          >
            {printerStatus.label}
          </Badge>
        ) : null}
        <Button
          type="button"
          variant={hasAssignedPrinter ? "outline" : "ghost"}
          className="rounded-xl"
          onClick={() => setIsChoiceOpen(true)}
        >
          {printerStatus.tone === "ready" ? (
            <Printer className="size-4" />
          ) : (
            <Monitor className="size-4" />
          )}
          {hasAssignedPrinter ? "Print / Preview" : "Receipt Options"}
        </Button>
      </div>

      <Dialog open={isChoiceOpen} onOpenChange={setIsChoiceOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Receipt Output</DialogTitle>
            <DialogDescription>{printerStatus.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <div>Printer: {printerName ?? "Not configured"}</div>
            <div>Mode: {getPrinterModeLabel(printerConfig?.mode)}</div>
            <div>
              Bluetooth is for BLE printers only. For Bluetooth Classic/SPP printers, use Pair Serial when supported by this browser.
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {printerCapabilities.map((capability) => {
                const Icon =
                  capability.mode === "usb-web"
                    ? Usb
                    : capability.mode === "bluetooth-ble-web"
                      ? Bluetooth
                      : capability.mode === "bluetooth-serial-web"
                        ? Cable
                        : Smartphone;

                return (
                  <Button
                    key={capability.mode}
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={isSaving || !capability.supported}
                    onClick={() => void handlePair(capability)}
                  >
                    <Icon className="size-4" />
                    {capability.label}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setIsChoiceOpen(false);
                  openPreview();
                }}
              >
                <ScanSearch className="size-4" />
                Preview
              </Button>
              <Button type="button" className="rounded-xl" onClick={() => void handlePrint()}>
                <Printer className="size-4" />
                Print Now
              </Button>
            </div>
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
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setIsPreviewOpen(false)}
            >
              Close
            </Button>
            <Button type="button" className="rounded-xl" onClick={() => void handlePrint()}>
              <Printer className="size-4" />
              Print from Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
