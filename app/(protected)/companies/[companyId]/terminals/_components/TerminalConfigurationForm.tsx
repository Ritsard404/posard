"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm } from "react-hook-form";
import { Bluetooth, Loader2, Printer, RotateCcw, Usb } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PrintJobDto,
  PrinterConfigDto,
} from "@/app/(protected)/pos/_services/_dto/print.dto";
import { printClientService } from "@/app/(protected)/pos/_services/print-client.service";
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
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TerminalConfigurationPayload>({
    resolver: zodResolver(TerminalConfigurationSchema) as Resolver<TerminalConfigurationPayload>,
  });

  useEffect(() => {
    if (!terminal) {
      reset({
        vat: undefined,
        discountMax: undefined,
        vatTinNumber: "",
        printerName: "",
        printerConfig: null,
      });
      setPrinterConfig(null);
      return;
    }

    reset({
      vat: terminal.vat ?? undefined,
      discountMax: terminal.discountMax ?? undefined,
      vatTinNumber: terminal.vatTinNumber ?? "",
      printerName: terminal.printerName ?? "",
      printerConfig: terminal.printerConfig ?? null,
    });
    setPrinterConfig(terminal.printerConfig ?? null);
  }, [terminal, reset]);

  const printerStatus = useMemo(
    () => printClientService.getStatus(printerConfig),
    [printerConfig],
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
      `Transport: ${config?.connectionType ?? "preview"}`,
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
    if (!config?.connectionType) {
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

  const handlePair = async (connectionType: "usb" | "bluetooth") => {
    setIsPairing(true);

    try {
      const paired = await printClientService.pair(connectionType);
      const nextConfig: PrinterConfigDto = {
        displayName: paired.displayName,
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
        description="Set the VAT rate and maximum discount allowed on this terminal."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup label="VAT Rate" error={errors.vat?.message}>
            <PercentInput {...register("vat")} placeholder="12" />
          </FieldGroup>
          <FieldGroup label="Max Discount" error={errors.discountMax?.message}>
            <PercentInput {...register("discountMax")} placeholder="20" />
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
        description="Pair the terminal's thermal printer over USB or Bluetooth and confirm the connection with a test print."
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
                value={printerConfig?.connectionType ?? "Not paired"}
                readOnly
                className="capitalize"
              />
            </FieldGroup>
          </div>

          <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <div>Device: {printerConfig?.displayName ?? "No paired device"}</div>
            <div>Transport: {printerConfig?.connectionType ?? "Preview only"}</div>
            <div>Device ID: {printerConfig?.deviceId ?? "Not available"}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isPairing || isTestingPrinter}
              onClick={() => void handlePair("usb")}
            >
              {isPairing ? <Loader2 className="size-4 animate-spin" /> : <Usb className="size-4" />}
              Pair USB
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isPairing || isTestingPrinter}
              onClick={() => void handlePair("bluetooth")}
            >
              {isPairing ? <Loader2 className="size-4 animate-spin" /> : <Bluetooth className="size-4" />}
              Pair Bluetooth
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isPairing || isTestingPrinter || !printerConfig?.connectionType}
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
