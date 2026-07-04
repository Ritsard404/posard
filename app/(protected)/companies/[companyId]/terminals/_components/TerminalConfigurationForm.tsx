"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm } from "react-hook-form";
import { Bluetooth, Cable, Info, Loader2, Printer, RotateCcw, Smartphone, Usb } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VatRegistrationToggle } from "@/components/vat-registration-toggle";
import type {
  PrinterCapabilityDto,
  PrintJobDto,
  PrinterConfigDto,
} from "@/app/(protected)/pos/_services/_dto/print.dto";
import { printClientService } from "@/app/(protected)/pos/_services/print-client.service";
import { getPrinterModeLabel } from "@/app/(protected)/pos/_services/printer-mode.service";
import { businessFitPresetGuides } from "@/app/(protected)/_services/business-fit-presets";
import {
  TerminalConfigurationSchema,
  type TerminalConfigurationPayload,
  type TerminalDTO,
} from "../../_services/terminal.dto";

interface TerminalConfigurationFormProps {
  terminal: TerminalDTO | null;
  focusSection?: "overview" | "terminal" | "printer";
  printerSectionRef?: RefObject<HTMLDivElement | null>;
  isSubmitting?: boolean;
  onSubmit: (terminal: TerminalDTO, data: TerminalConfigurationPayload) => void;
}

export default function TerminalConfigurationForm({
  terminal,
  focusSection = "overview",
  printerSectionRef,
  isSubmitting = false,
  onSubmit,
}: TerminalConfigurationFormProps) {
  const [printerConfig, setPrinterConfig] = useState<PrinterConfigDto | null>(
    terminal?.printerConfig ?? null,
  );
  const [pairingMode, setPairingMode] = useState<PrinterCapabilityDto["mode"] | null>(null);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [isCheckingNative, setIsCheckingNative] = useState(false);
  const financialSectionRef = useRef<HTMLDivElement | null>(null);
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
        vat: 0,
        discountCapType: "amount",
        discountMax: undefined,
        vatTinNumber: "",
        printerName: "",
        printerConfig: null,
        allowCashierDebtCreate: false,
        allowCashierDebtCollect: false,
        requireManagerApprovalForDebt: false,
        defaultDebtDueDays: undefined,
        businessModeOverride: null,
        businessTypePresetOverride: null,
        enableFulfillmentTypes: false,
        enableRestaurantFeatures: false,
        enableTableService: false,
        enableDeliveryDetails: false,
        enableProductModifiers: false,
        enableKitchenTickets: false,
      });
      setPrinterConfig(null);
      return;
    }

    reset({
      vat: terminal.vat ?? 0,
      discountCapType: terminal.discountCapType,
      discountMax: terminal.discountMax ?? undefined,
      vatTinNumber: terminal.vatTinNumber ?? "",
      printerName: terminal.printerName ?? "",
      printerConfig: terminal.printerConfig ?? null,
      allowCashierDebtCreate: terminal.allowCashierDebtCreate,
      allowCashierDebtCollect: terminal.allowCashierDebtCollect,
      requireManagerApprovalForDebt: terminal.requireManagerApprovalForDebt,
      defaultDebtDueDays: terminal.defaultDebtDueDays ?? undefined,
      businessModeOverride: terminal.businessModeOverride ?? null,
      businessTypePresetOverride: terminal.businessTypePresetOverride ?? null,
      enableFulfillmentTypes: terminal.enableFulfillmentTypes,
      enableRestaurantFeatures: terminal.enableRestaurantFeatures,
      enableTableService: terminal.enableTableService,
      enableDeliveryDetails: terminal.enableDeliveryDetails,
      enableProductModifiers: terminal.enableProductModifiers,
      enableKitchenTickets: terminal.enableKitchenTickets,
    });
    setPrinterConfig(terminal.printerConfig ?? null);
  }, [terminal, reset]);

  useEffect(() => {
    if (!terminal) {
      return;
    }

    const target =
      focusSection === "printer"
        ? printerSectionRef?.current ?? null
        : focusSection === "terminal"
          ? financialSectionRef.current
          : null;

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusSection, printerSectionRef, terminal]);

  const printerStatus = useMemo(
    () => printClientService.getStatus(printerConfig),
    [printerConfig],
  );
  const discountCapType = watch("discountCapType");
  const isVatRegistered = Number(watch("vat") ?? 0) > 0;
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
      const result = await printClientService.print(buildTestJob(config), {
        fallbackToPreview: false,
      });

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

    setPairingMode(capability.mode);

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

      setPrinterConfig(nextConfig);
      setValue("printerConfig", nextConfig, { shouldDirty: true, shouldValidate: true });
      setValue("printerName", paired.displayName, { shouldDirty: true, shouldValidate: true });

      toast.success("Printer paired.", {
        description: `${paired.displayName} is paired. Use Test Print to verify the route.`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to pair printer.",
      );
    } finally {
      setPairingMode(null);
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
        sectionRef={financialSectionRef}
        title="Financial"
        description="Set VAT registration and choose whether this terminal's max discount is capped by amount or by percent."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <input type="hidden" {...register("vat")} />
          <FieldGroup label="VAT Registration" error={errors.vat?.message}>
            <VatRegistrationToggle
              checked={isVatRegistered}
              disabled={isSubmitting}
              onCheckedChange={(checked) => {
                setValue("vat", checked ? 12 : 0, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                if (!checked) {
                  setValue("vatTinNumber", null, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              }}
            />
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
        title="Terminal Business Features"
        description="Enable restaurant and hybrid behavior only on terminals that need it."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup label="Business Mode" error={errors.businessModeOverride?.message}>
            <select
              {...register("businessModeOverride")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Inherit retail default</option>
              <option value="RETAIL">Retail</option>
              <option value="RESTAURANT">Restaurant</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Business Preset" error={errors.businessTypePresetOverride?.message}>
            <select
              {...register("businessTypePresetOverride")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Inherit company preset</option>
              {businessFitPresetGuides.map((guide) => (
                <option key={guide.preset} value={guide.preset}>
                  {guide.label}
                </option>
              ))}
            </select>
          </FieldGroup>
          {[
            ["enableRestaurantFeatures", "Restaurant flow"],
            ["enableFulfillmentTypes", "Fulfillment picker"],
            ["enableTableService", "Dine-in/table service"],
            ["enableDeliveryDetails", "Delivery details"],
            ["enableProductModifiers", "Product modifiers/add-ons"],
            ["enableKitchenTickets", "Kitchen ticket readiness"],
          ].map(([name, label]) => (
            <label key={name} className="flex items-start gap-3 rounded-xl border p-3">
              <input
                type="checkbox"
                className="mt-1"
                {...register(name as keyof TerminalConfigurationPayload)}
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium text-foreground">{label}</span>
              </span>
            </label>
          ))}
        </div>
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
            <Input
              {...register("vatTinNumber")}
              disabled={!isVatRegistered || isSubmitting}
              placeholder={isVatRegistered ? "123-456-789-0000" : "None"}
            />
          </FieldGroup>
        </div>
      </SectionCard>

      <SectionCard
        title="Device"
        description="Configure USB, Bluetooth BLE, Bluetooth Serial, or built-in Sunmi printing and confirm the active route with a test print."
        sectionRef={printerSectionRef}
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
              const isConnecting = pairingMode === capability.mode;
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
                    Boolean(pairingMode) ||
                    isTestingPrinter ||
                    !capability.supported
                  }
                  onClick={() => void handlePair(capability)}
                >
                  {isConnecting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                  {isConnecting ? `Connecting ${capability.label}` : capability.label}
                </Button>
              );
            })}
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || Boolean(pairingMode) || isTestingPrinter || !printerConfig?.mode}
              onClick={() => void runTestPrint(printerConfig)}
            >
              {isTestingPrinter ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
              Test Print
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting || Boolean(pairingMode) || isTestingPrinter}
              onClick={handleClearPrinter}
            >
              <RotateCcw className="size-4" />
              Clear Pairing
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Pairing saves the selected device first. Test Print verifies the route and returns a message without opening another tab.
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
  sectionRef,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  sectionRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <Card ref={sectionRef} className="p-5">
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </Card>
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
