"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bluetooth,
  Cable,
  CheckCircle2,
  Loader2,
  Printer,
  RotateCcw,
  Smartphone,
  Usb,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { saveSessionPrinterConfigAction } from "../_actions/pos.action";
import type {
  PrintJobDto,
  PrinterCapabilityDto,
  PrinterConfigDto,
} from "../_services/_dto/print.dto";
import { printClientService } from "../_services/print-client.service";
import { getPrinterModeLabel } from "../_services/printer-mode.service";
import { usePOSStore } from "../_store/pos-store";

interface SessionPrinterConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getCapabilityIcon(mode: PrinterCapabilityDto["mode"]) {
  if (mode === "usb-web") {
    return Usb;
  }

  if (mode === "bluetooth-ble-web") {
    return Bluetooth;
  }

  if (mode === "bluetooth-serial-web") {
    return Cable;
  }

  return Smartphone;
}

function formatConfigValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return String(value);
}

function getCapabilityHint(capability: PrinterCapabilityDto) {
  if (!capability.supported) {
    return capability.reason ?? capability.description;
  }

  if (capability.mode === "usb-web") {
    return "Best default for a fast and stable setup.";
  }

  if (capability.mode === "bluetooth-ble-web") {
    return "Use this for BLE printers only.";
  }

  if (capability.mode === "bluetooth-serial-web") {
    return "Use this for Bluetooth Classic or SPP printers.";
  }

  return "Requires the Sunmi wrapper or native bridge.";
}

function isPairChooserCancellation(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("requestdevice() chooser") ||
    message.includes("user cancelled") ||
    message.includes("user canceled") ||
    message.includes("notfounderror") ||
    message.includes("aborterror")
  );
}

export function SessionPrinterConfigDialog({
  open,
  onOpenChange,
}: SessionPrinterConfigDialogProps) {
  const activeTimestampId = usePOSStore((state) => state.activeTimestampId);
  const activeTerminal = usePOSStore((state) => state.activeTerminal);
  const printerCapabilities = usePOSStore((state) => state.printerCapabilities);
  const setActiveTerminalPrinterConfig = usePOSStore(
    (state) => state.setActiveTerminalPrinterConfig,
  );
  const [printerConfig, setPrinterConfig] = useState<PrinterConfigDto | null>(
    activeTerminal?.printerConfig ?? null,
  );
  const [isPairing, setIsPairing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    setPrinterConfig(activeTerminal?.printerConfig ?? null);
  }, [activeTerminal?.printerConfig, open]);

  const printerStatus = useMemo(
    () => printClientService.getStatus(printerConfig),
    [printerConfig],
  );
  const availableCapabilities = useMemo(
    () =>
      printerCapabilities.length > 0
        ? printerCapabilities
        : printClientService.getCapabilities(),
    [printerCapabilities],
  );

  const buildTestJob = (config: PrinterConfigDto | null): PrintJobDto => ({
    title: "Printer Test",
    intent: "receipt",
    previewContent: [
      "POSARD PRINTER TEST",
      `Terminal: ${activeTerminal?.name ?? "Active terminal"}`,
      `Printer: ${config?.displayName ?? "Not configured"}`,
      `Mode: ${getPrinterModeLabel(config?.mode)}`,
      new Date().toLocaleString(),
      "",
      "Connection successful.",
      "",
      "",
      "",
    ].join("\n"),
    printerConfig: config,
  });

  const savePrinterConfig = async (nextConfig: PrinterConfigDto | null) => {
    if (!activeTimestampId) {
      throw new Error("Open a POS session before configuring a printer.");
    }

    const result = await saveSessionPrinterConfigAction(activeTimestampId, nextConfig);

    if (!result.success) {
      throw new Error(result.error);
    }

    setPrinterConfig(nextConfig);
    setActiveTerminalPrinterConfig(nextConfig);
  };

  const handlePair = async (capability: PrinterCapabilityDto) => {
    if (!activeTimestampId) {
      toast.error("Open a POS session before configuring a printer.");
      return;
    }

    if (!capability.supported) {
      toast.error(capability.reason ?? "This printer mode is not available.");
      return;
    }

    setIsPairing(true);

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

      await savePrinterConfig(nextConfig);
      toast.success("Printer paired and saved.", {
        description: `${paired.displayName} is ready on this terminal.`,
      });
    } catch (error) {
      if (isPairChooserCancellation(error)) {
        return;
      }

      toast.error(
        error instanceof Error ? error.message : "Failed to pair printer.",
      );
    } finally {
      setIsPairing(false);
    }
  };

  const handleTestPrint = async () => {
    if (!printerConfig?.mode) {
      toast.error("Pair a printer before running a test print.");
      return;
    }

    setIsTesting(true);

    try {
      const result = await printClientService.print(buildTestJob(printerConfig), {
        fallbackToPreview: false,
      });

      if (result.status !== "printed") {
        toast.error(result.message);
        return;
      }

      toast.success("Test print sent.", {
        description: result.message,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send a printer test.",
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = async () => {
    if (!activeTimestampId) {
      toast.error("Open a POS session before configuring a printer.");
      return;
    }

    setIsClearing(true);

    try {
      await savePrinterConfig(null);
      toast.success("Printer pairing cleared for this terminal.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to clear printer pairing.",
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(86dvh,44rem)] max-h-[86dvh] flex-col gap-0 overflow-hidden rounded-[28px] border-0 p-0 shadow-2xl sm:h-[min(88dvh,44rem)] sm:max-h-[88dvh] sm:max-w-xl">
        <DialogHeader className="gap-3 border-b bg-gradient-to-br from-slate-950 via-slate-900 to-sky-900 px-4 py-3 text-left text-white sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white"
            >
              {printerStatus.label}
            </Badge>
            <span className="text-sm text-slate-300">
              {activeTerminal?.name ?? "No active terminal"}
            </span>
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight text-white">
            Printer Setup
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-200 sm:hidden">
            Pick a method to connect.
          </DialogDescription>
          <DialogDescription className="hidden text-sm text-slate-200 sm:block">
            Connect a printer first, then run a test print.
          </DialogDescription>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-slate-100 sm:px-4 sm:py-3">
            <div className="font-semibold text-white">
              {printerConfig?.displayName ?? "No printer paired yet"}
            </div>
            <div className="text-slate-300">
              {printerConfig?.mode
                ? `${getPrinterModeLabel(printerConfig.mode)} · ${printerConfig.driver ?? "Preview only"}`
                : "Choose a connection method below"}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [-webkit-overflow-scrolling:touch] sm:px-6 sm:py-4">
          <div className="space-y-3 pb-4 sm:space-y-4">
            <div className="space-y-2 sm:space-y-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Connect printer
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tap a button below to start pairing.
                </p>
              </div>

              <div className="grid gap-3">
                {availableCapabilities.map((capability) => {
                  const Icon = getCapabilityIcon(capability.mode);
                  const isActive = capability.mode === printerConfig?.mode;
                  const isDisabled =
                    isPairing || isTesting || isClearing || !capability.supported;

                  return (
                    <Button
                      key={capability.mode}
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-auto min-h-14 justify-start rounded-3xl border px-3 py-3.5 text-left transition-all sm:min-h-16 sm:px-4 sm:py-4",
                        "hover:border-sky-300 hover:bg-sky-50/70",
                        isActive &&
                          "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-50",
                        !capability.supported &&
                          "border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground hover:bg-muted/20",
                      )}
                      disabled={isDisabled}
                      onClick={() => void handlePair(capability)}
                    >
                      <div className="flex w-full items-start gap-3">
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-background sm:size-12",
                            isActive && "border-emerald-200 bg-emerald-100 text-emerald-700",
                          )}
                        >
                          {isPairing ? (
                            <Loader2 className="size-5 animate-spin" />
                          ) : (
                            <Icon className="size-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">
                              {isActive ? "Connected" : "Connect"} {capability.label}
                            </span>
                            {isActive ? (
                              <Badge className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-white hover:bg-emerald-600">
                                Active
                              </Badge>
                            ) : null}
                            <Badge
                              variant={capability.supported ? "secondary" : "outline"}
                              className="rounded-full px-2.5 py-0.5"
                            >
                              {capability.supported ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getCapabilityHint(capability)}
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            <Card className="rounded-3xl border-amber-200 bg-amber-50/80 shadow-none">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                  <Printer className="size-4" />
                  Quick help
                </div>
                <div className="text-sm text-amber-950/90">
                  <span className="sm:hidden">
                    Start with USB if you are unsure.
                  </span>
                  <span className="hidden sm:inline">
                    Start with USB if you are unsure. Use Bluetooth BLE only for BLE printers. Use Bluetooth Serial for Classic or SPP printers.
                  </span>
                </div>
              </CardContent>
            </Card>

            {printerConfig ? (
              <Card className="hidden rounded-3xl border shadow-none sm:block">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="size-4" />
                    <span className="text-sm font-semibold">
                      {printerStatus.description}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-muted/30 px-3 py-3 text-sm">
                    <div className="font-semibold text-foreground">
                      {printerConfig.displayName ?? "Configured printer"}
                    </div>
                    <div className="text-muted-foreground">
                      {getPrinterModeLabel(printerConfig.mode)} · {printerConfig.driver ?? "Preview only"}
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-start justify-between gap-3 rounded-2xl bg-muted/30 px-3 py-2">
                      <span>Vendor ID</span>
                      <span className="font-medium text-foreground">
                        {formatConfigValue(printerConfig.vendorId)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-2xl bg-muted/30 px-3 py-2">
                      <span>Product ID</span>
                      <span className="font-medium text-foreground">
                        {formatConfigValue(printerConfig.productId)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-2xl bg-muted/30 px-3 py-2">
                      <span>Service UUID</span>
                      <span className="max-w-[10rem] truncate font-medium text-foreground">
                        {formatConfigValue(printerConfig.serviceUuid)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-2xl bg-muted/30 px-3 py-2">
                      <span>Characteristic</span>
                      <span className="max-w-[10rem] truncate font-medium text-foreground">
                        {formatConfigValue(printerConfig.characteristicUuid)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <Separator />

        <DialogFooter className="shrink-0 gap-2 bg-background px-4 py-3 sm:gap-3 sm:px-6 sm:py-4 sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {printerConfig?.displayName
              ? `Connected: ${printerConfig.displayName}`
              : "No printer paired yet"}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="rounded-2xl sm:order-none"
            disabled={isPairing || isTesting || isClearing}
            onClick={() => void handleClear()}
          >
            {isClearing ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Clear Pairing
          </Button>
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-2xl sm:flex-none"
              disabled={
                isPairing ||
                isTesting ||
                isClearing ||
                !printerConfig?.mode
              }
              onClick={() => void handleTestPrint()}
            >
              {isTesting ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
              Test Print
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-2xl sm:flex-none"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
