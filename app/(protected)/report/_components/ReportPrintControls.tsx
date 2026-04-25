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
import {
  createReportPrintArchiveAction,
  reprintReportPrintArchiveAction,
  saveReportTerminalPrinterConfigAction,
} from "../_actions/report.action";
import type { ReportPrintPayloadDto } from "../_services/_dto/report.dto";
import type {
  PrinterCapabilityDto,
  PrintJobDto,
  PrinterConfigDto,
} from "@/app/(protected)/pos/_services/_dto/print.dto";
import { printClientService } from "@/app/(protected)/pos/_services/print-client.service";
import { getPrinterModeLabel } from "@/app/(protected)/pos/_services/printer-mode.service";

interface ReportPrintControlsProps {
  payload: ReportPrintPayloadDto | null;
  companyId?: string | null;
  terminalId?: string | null;
}

function buildJob(
  payload: ReportPrintPayloadDto,
  printerConfig: PrinterConfigDto | null,
): PrintJobDto {
  return {
    title: payload.title,
    intent:
      payload.view === "x-reading"
        ? "x-reading"
        : payload.view === "z-reading"
          ? "z-reading"
          : "report",
    previewContent: payload.previewContent,
    printSegments: payload.printSegments,
    printerConfig,
  };
}

export function ReportPrintControls({
  payload,
  companyId,
  terminalId,
}: ReportPrintControlsProps) {
  const [printerConfig, setPrinterConfig] = useState<PrinterConfigDto | null>(
    payload?.printerConfig ?? null,
  );
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [archiveDocumentId, setArchiveDocumentId] = useState<string | null>(
    null,
  );
  const autoPrintKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setPrinterConfig(payload?.printerConfig ?? null);
    setArchiveDocumentId(null);
  }, [payload?.printerConfig]);

  const printerStatus = useMemo(
    () => printClientService.getStatus(printerConfig),
    [printerConfig],
  );
  const printerCapabilities = useMemo(
    () => printClientService.getCapabilities(),
    [],
  );

  const job = useMemo(
    () => (payload ? buildJob(payload, printerConfig) : null),
    [payload, printerConfig],
  );

  useEffect(() => {
    if (
      !payload ||
      !job ||
      !terminalId ||
      !["x-reading", "z-reading"].includes(payload.view) ||
      !printerConfig?.autoPrintEnabled ||
      !printerConfig?.mode
    ) {
      return;
    }

    const autoPrintKey = `${payload.view}:${payload.previewContent}:${printerConfig.displayName ?? "none"}`;

    if (autoPrintKeyRef.current === autoPrintKey) {
      return;
    }

    autoPrintKeyRef.current = autoPrintKey;

    void (async () => {
      try {
        let printJob = job;

        if (payload.archiveType) {
          const archiveResult = await createReportPrintArchiveAction({
            type: payload.archiveType,
            content: payload.archiveContent,
            isTrainMode: payload.isTrainMode,
          });

          if (!archiveResult.success) {
            toast.error(archiveResult.error);
            return;
          }

          setArchiveDocumentId(archiveResult.data.documentId);
          printJob = {
            ...job,
            previewContent: archiveResult.data.content,
            printSegments: [archiveResult.data.content],
          };
        }

        const result = await printClientService.print(printJob, {
          fallbackToPreview: false,
        });

        if (result.status === "printed") {
          toast.success(`${payload.title} sent to printer.`, {
            description: result.message,
          });
          return;
        }

        setIsPreviewOpen(true);
        toast.error(result.message, {
          description: "Preview opened instead so you can still review or reprint this report.",
        });
      } catch (error) {
        setIsPreviewOpen(true);
        toast.error(error instanceof Error ? error.message : `Unable to print ${payload.title}.`, {
          description: "Preview opened instead so you can still review or reprint this report.",
        });
      }
    })();
  }, [job, payload, printerConfig, terminalId]);

  if (!payload || !job) {
    return null;
  }

  const printerName = printerConfig?.displayName ?? payload.printerName ?? null;

  const openPreviewFallback = (message?: string) => {
    setIsChoiceOpen(false);
    setIsPreviewOpen(true);

    if (message) {
      toast.error(message, {
        description: "Preview opened instead so you can still review or reprint this report.",
      });
    }
  };

  const handlePrint = async () => {
    try {
      let printJob = job;

      if (payload.archiveType) {
        const archiveResult = archiveDocumentId
          ? await reprintReportPrintArchiveAction({
              documentId: archiveDocumentId,
              type: payload.archiveType,
            })
          : await createReportPrintArchiveAction({
              type: payload.archiveType,
              content: payload.archiveContent,
              isTrainMode: payload.isTrainMode,
            });

        if (!archiveResult.success) {
          toast.error(archiveResult.error);
          return;
        }

        setArchiveDocumentId(archiveResult.data.documentId);
        printJob = {
          ...job,
          previewContent: archiveResult.data.content,
          printSegments: [archiveResult.data.content],
        };
      }

      const result = await printClientService.print(printJob, {
        fallbackToPreview: false,
      });
      setIsChoiceOpen(false);

      if (result.status === "printed") {
        toast.success("Printing in progress...", {
          description: result.message,
        });
        return;
      }

      openPreviewFallback(result.message);
    } catch (error) {
      openPreviewFallback(
        error instanceof Error ? error.message : "Printing failed.",
      );
    }
  };

  const handlePair = async (capability: PrinterCapabilityDto) => {
    if (!companyId || !terminalId) {
      toast.error("Select a single terminal before pairing a printer.");
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
      const result = await saveReportTerminalPrinterConfigAction({
        companyId,
        terminalId,
        printerConfig: nextConfig,
      });

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
        <Badge
          variant={printerStatus.tone === "ready" ? "secondary" : "outline"}
          className="rounded-full px-3 py-1"
        >
          {printerStatus.label}
        </Badge>
        <Button
          onClick={() => setIsChoiceOpen(true)}
          className="h-11 rounded-xl"
        >
          {printerStatus.tone === "ready" ? (
            <Printer className="size-4" />
          ) : (
            <Monitor className="size-4" />
          )}
          Print / Preview
        </Button>
      </div>

      <Dialog open={isChoiceOpen} onOpenChange={setIsChoiceOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{payload.title}</DialogTitle>
            <DialogDescription>{printerStatus.description}</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border bg-muted/30 p-4 text-sm">
            <div className="font-medium text-foreground">
              Terminal: {payload.terminalName ?? "All terminals"}
            </div>
            <div className="mt-1 text-muted-foreground">
              Printer: {printerName ?? "Not configured"}
            </div>
            <div className="mt-1 text-muted-foreground">
              Mode: {getPrinterModeLabel(printerConfig?.mode)}
            </div>
            <div className="mt-1 text-muted-foreground">
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
                    disabled={isSaving || !terminalId || !capability.supported}
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
                  setIsPreviewOpen(true);
                }}
              >
                <ScanSearch className="size-4" />
                Preview
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => void handlePrint()}
              >
                <Printer className="size-4" />
                Print Now
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[85vh] rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{payload.title} Preview</DialogTitle>
            <DialogDescription>
              Generated {payload.generatedAtLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <pre className="max-h-[58vh] overflow-auto whitespace-pre-wrap font-mono text-xs leading-6 text-foreground">
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
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => void handlePrint()}
            >
              <Printer className="size-4" />
              Print from Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
