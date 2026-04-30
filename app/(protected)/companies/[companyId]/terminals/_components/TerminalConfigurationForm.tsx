"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm } from "react-hook-form";
import { Bluetooth, Cable, Info, Loader2, Printer, RotateCcw, Smartphone, Usb } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PrinterCapabilityDto,
  PrintJobDto,
  PrinterConfigDto,
} from "@/app/(protected)/pos/_services/_dto/print.dto";
import { printClientService } from "@/app/(protected)/pos/_services/print-client.service";
import { getPrinterModeLabel } from "@/app/(protected)/pos/_services/printer-mode.service";
import {
  TerminalConfigurationSchema,
  type TerminalConfigurationPayload,
  type TerminalDTO,
} from "../../_services/terminal.dto";

interface TerminalConfigurationFormProps {
  terminal: TerminalDTO | null;
  isSubmitting?: boolean;
  onSubmit: (terminal: TerminalDTO, data: TerminalConfigurationPayload) => void;
}

export default function TerminalConfigurationForm({
  terminal,
  isSubmitting = false,
  onSubmit,
}: TerminalConfigurationFormProps) {
  const [printerConfig, setPrinterConfig] = useState<PrinterConfigDto | null>(
    terminal?.printerConfig ?? null,
  );
  const [isPairing, setIsPairing] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [isCheckingNative, setIsCheckingNative] = useState(false);
  const [nativeDiagnostics, setNativeDiagnostics] = useState<Awaited<
    ReturnType<typeof printClientService.getNativeDiagnostics>
  > | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TerminalConfigurationPayload>({
    resolver: zodResolver(TerminalConfigurationSchema) as Resolver<TerminalConfigurationPayload>,
  });

  useEffect(() => {
    if (!terminal) {
      reset({
        vat: undefined,
        discountCapType: "amount",
        discountMax: undefined,
        vatTinNumber: "",
        printerName: "",
        printerConfig: null,
        allowCashierDebtCreate: false,
        allowCashierDebtCollect: false,
        requireManagerApprovalForDebt: false,
        defaultDebtDueDays: undefined,
      });
      setPrinterConfig(null);
      return;
    }

    reset({
      vat: terminal.vat ?? undefined,
      discountCapType: terminal.discountCapType,
      discountMax: terminal.discountMax ?? undefined,
      vatTinNumber: terminal.vatTinNumber ?? "",
      printerName: terminal.printerName ?? "",
      printerConfig: terminal.printerConfig ?? null,
      allowCashierDebtCreate: terminal.allowCashierDebtCreate,
      allowCashierDebtCollect: terminal.allowCashierDebtCollect,
      requireManagerApprovalForDebt: terminal.requireManagerApprovalForDebt,
      defaultDebtDueDays: terminal.defaultDebtDueDays ?? undefined,
    });
    setPrinterConfig(terminal.printerConfig ?? null);
  }, [terminal, reset]);

  const printerStatus = useMemo(
    () => printClientService.getStatus(printerConfig),
    [printerConfig],
  );
  const discountCapType = watch("discountCapType");
  const printerCapabilities = useMemo(
    () => printClientService.getCapabilities(),
    [],
  );

  if (!terminal) {
    return null;
  }

  const buildTestJob = (config: PrinterConfigDto | null): PrintJobDto => ({
    title: "Printer Test",
    intent: "receipt",
    previewContent: [
      "POSARD PRINTER TEST",
      `Terminal: ${terminal.posName ?? "Unnamed terminal"}`,
      `Printer: ${(config?.displayName ?? terminal.printerName) || "PB-58H"}`,
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

  const runTestPrint = async (config: PrinterConfigDto | null) => {
    if (!config?.mode) {
      toast.error("Pair a printer before running a test print.");
      return false;
    }

    setIsTestingPrinter(true);

    try {
      const result = await printClientService.print(buildTestJob(config));

      if (result.status !== "printed") {
        toast.error(result.message);
        return false;
      }

      toast.success("Test print sent.", {
        description: result.message,
      });
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send a printer test.",
      );
      return false;
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const handlePair = async (capability: PrinterCapabilityDto) => {
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

      const didPrint = await runTestPrint(nextConfig);

      if (!didPrint) {
        return;
      }

      setPrinterConfig(nextConfig);
      setValue("printerConfig", nextConfig, { shouldDirty: true, shouldValidate: true });
      setValue("printerName", paired.displayName, { shouldDirty: true, shouldValidate: true });

      toast.success("Printer paired.", {
        description: `${paired.displayName} is ready for this terminal.`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to pair printer.",
      );
    } finally {
      setIsPairing(false);
    }
  };

  const handleClearPrinter = () => {
    setPrinterConfig(null);
    setValue("printerConfig", null, { shouldDirty: true, shouldValidate: true });
    setValue("printerName", "", { shouldDirty: true, shouldValidate: true });
  };

  const handleCheckNativeDiagnostics = async () => {
    if (printerConfig?.driver !== "sunmi-native") {
      toast.error("Select the built-in SUNMI printer mode first.");
      return;
    }

    setIsCheckingNative(true);

    try {
      const diagnostics = await printClientService.getNativeDiagnostics(printerConfig);
      setNativeDiagnostics(diagnostics);

      if (!diagnostics) {
        toast.error("Native diagnostics are only available for SUNMI built-in mode.");
        return;
      }

      if (!diagnostics.available) {
        toast.error("SUNMI built-in printer service is not available on this device.", {
          description: diagnostics.model,
        });
        return;
      }

      toast.success("SUNMI printer service detected.", {
        description: `${diagnostics.model}${diagnostics.paperWidth ? ` · ${diagnostics.paperWidth}` : ""}`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to read native printer diagnostics.",
      );
    } finally {
      setIsCheckingNative(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit((data) =>
        onSubmit(terminal, {
          ...data,
          printerConfig,
        }),
      )}
      className="space-y-4"
    >
      <SectionCard
        title="Financial"
        description="Set the VAT rate and choose whether this terminal's max discount is capped by amount or by percent."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup label="VAT Rate" error={errors.vat?.message}>
            <PercentInput {...register("vat")} placeholder="12" />
          </FieldGroup>
          <FieldGroup label="Discount Cap Type" error={errors.discountCapType?.message}>
            <select
              {...register("discountCapType")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="amount">Amount</option>
              <option value="percent">Percent</option>
            </select>
          </FieldGroup>
          <FieldGroup
            label={discountCapType === "percent" ? "Discount Cap (%)" : "Discount Cap Amount"}
            error={errors.discountMax?.message}
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register("discountMax")}
              placeholder={discountCapType === "percent" ? "20" : "100"}
            />
          </FieldGroup>
        </div>
        <p className="text-xs text-muted-foreground">
          {discountCapType === "percent"
            ? "When Max Discount is used during checkout, the discount will be capped by this percentage."
            : "When Max Discount is used during checkout, the discount will be capped by this peso amount."}
        </p>
      </SectionCard>

      <SectionCard
        title="Debt Controls"
        description="Control who can create or collect utang and whether a manager PIN is required during debt issuance."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border p-3">
            <input type="checkbox" className="mt-1" {...register("allowCashierDebtCreate")} />
            <span className="space-y-1">
              <span className="block text-sm font-medium text-foreground">Allow cashier debt issuance</span>
              <span className="block text-xs text-muted-foreground">
                Cashiers can record an invoice as utang during checkout.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border p-3">
            <input type="checkbox" className="mt-1" {...register("allowCashierDebtCollect")} />
            <span className="space-y-1">
              <span className="block text-sm font-medium text-foreground">Allow cashier debt collection</span>
              <span className="block text-xs text-muted-foreground">
                Cashiers can accept later debt payments from the debts workspace.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border p-3 md:col-span-2">
            <input type="checkbox" className="mt-1" {...register("requireManagerApprovalForDebt")} />
            <span className="space-y-1">
              <span className="block text-sm font-medium text-foreground">Require manager approval for debt</span>
              <span className="block text-xs text-muted-foreground">
                Reuse the existing manager PIN approval flow before an utang invoice can be issued.
              </span>
            </span>
          </label>
          <FieldGroup label="Default Due Days" error={errors.defaultDebtDueDays?.message}>
            <Input type="number" min="1" max="365" {...register("defaultDebtDueDays")} placeholder="7" />
          </FieldGroup>
        </div>
      </SectionCard>

      <SectionCard
        title="Business Info"
        description="Maintain the terminal's tax information."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup label="VAT TIN" error={errors.vatTinNumber?.message}>
            <Input {...register("vatTinNumber")} placeholder="123-456-789-0000" />
          </FieldGroup>
        </div>
      </SectionCard>

      <SectionCard
        title="Device"
        description="Configure USB, Bluetooth BLE, Bluetooth Serial, or built-in Sunmi printing and confirm the active route with a test print."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={printerStatus.tone === "ready" ? "secondary" : "outline"}>
              {printerStatus.label}
            </Badge>
            <span className="text-sm text-muted-foreground">{printerStatus.description}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup label="Printer" error={errors.printerName?.message}>
              <Input {...register("printerName")} placeholder="PB-58H" />
            </FieldGroup>
            <FieldGroup label="Connection">
              <Input
                value={getPrinterModeLabel(printerConfig?.mode)}
                readOnly
              />
            </FieldGroup>
          </div>

          <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <div>Device: {printerConfig?.displayName ?? "No paired device"}</div>
            <div>Mode: {getPrinterModeLabel(printerConfig?.mode)}</div>
            <div>Device ID: {printerConfig?.deviceId ?? "Not available"}</div>
          </div>
          {printerConfig?.driver === "sunmi-native" ? (
            <Card className="rounded-2xl border shadow-none">
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Native diagnostics
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Check if the SUNMI built-in printer service is reachable.
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isCheckingNative}
                    onClick={() => void handleCheckNativeDiagnostics()}
                  >
                    {isCheckingNative ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Info className="size-4" />
                    )}
                    Check native status
                  </Button>
                </div>
                {nativeDiagnostics ? (
                  <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                    <div>Device model: <span className="font-medium text-foreground">{nativeDiagnostics.model}</span></div>
                    <div>Connected: <span className="font-medium text-foreground">{nativeDiagnostics.connected ? "Yes" : "No"}</span></div>
                    <div>Printer model: <span className="font-medium text-foreground">{nativeDiagnostics.printerModel ?? "Not available"}</span></div>
                    <div>Paper width: <span className="font-medium text-foreground">{nativeDiagnostics.paperWidth ?? "Not available"}</span></div>
                    <div>Service version: <span className="font-medium text-foreground">{nativeDiagnostics.serviceVersion ?? "Not available"}</span></div>
                    <div>Status code: <span className="font-medium text-foreground">{nativeDiagnostics.statusCode ?? "Not available"}</span></div>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

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
                  disabled={
                    isSubmitting ||
                    isPairing ||
                    isTestingPrinter ||
                    !capability.supported
                  }
                  onClick={() => void handlePair(capability)}
                >
                  {isPairing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                  {capability.label}
                </Button>
              );
            })}
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isPairing || isTestingPrinter || !printerConfig?.mode}
              onClick={() => void runTestPrint(printerConfig)}
            >
              {isTestingPrinter ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
              Test Print
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting || isPairing || isTestingPrinter}
              onClick={handleClearPrinter}
            >
              <RotateCcw className="size-4" />
              Clear Pairing
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Pairing is only kept after the terminal successfully sends a test receipt to the selected device.
          </p>
          <p className="text-xs text-muted-foreground">
            Bluetooth pairing only works for BLE printers with a writable GATT characteristic. For Bluetooth Classic/SPP printers, use the serial option when the browser supports it. Built-in Sunmi printing requires the native Sunmi bridge runtime.
          </p>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Save Configuration"}
        </Button>
      </div>
    </form>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </Card>
  );
}

function PercentInput(props: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Input type="number" min="0" max="100" step="0.01" className="pr-10" {...props} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
        %
      </span>
    </div>
  );
}

function FieldGroup({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
