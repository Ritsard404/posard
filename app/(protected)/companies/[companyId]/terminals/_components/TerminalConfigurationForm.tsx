"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TerminalConfigurationPayload>({
    resolver: zodResolver(TerminalConfigurationSchema) as Resolver<TerminalConfigurationPayload>,
  });

  useEffect(() => {
    if (!terminal) {
      reset({
        vat: 12,
        discountMax: 20,
        vatTinNumber: "",
        address: "",
        costCenter: "",
        branchCenter: "",
        useCenter: "",
        printerName: "",
      });
      return;
    }

    reset({
      vat: terminal.vat ?? 12,
      discountMax: terminal.discountMax ?? 20,
      vatTinNumber: terminal.vatTinNumber,
      address: terminal.address,
      costCenter: terminal.costCenter,
      branchCenter: terminal.branchCenter,
      useCenter: terminal.useCenter,
      printerName: terminal.printerName ?? "",
    });
  }, [terminal, reset]);

  if (!terminal) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(terminal, data))} className="space-y-4">
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
        description="Maintain the terminal's tax and address information."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup label="VAT TIN" error={errors.vatTinNumber?.message}>
            <Input {...register("vatTinNumber")} placeholder="123-456-789-0000" />
          </FieldGroup>
          <FieldGroup label="Address" error={errors.address?.message} className="md:col-span-2">
            <Input {...register("address")} placeholder="Street, City, Province" />
          </FieldGroup>
        </div>
      </SectionCard>

      <SectionCard
        title="Organizational"
        description="Apply company tags used for reporting and operational grouping."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FieldGroup label="Cost Center" error={errors.costCenter?.message}>
            <Input {...register("costCenter")} placeholder="Optional" />
          </FieldGroup>
          <FieldGroup label="Branch Center" error={errors.branchCenter?.message}>
            <Input {...register("branchCenter")} placeholder="Optional" />
          </FieldGroup>
          <FieldGroup label="Use Center" error={errors.useCenter?.message}>
            <Input {...register("useCenter")} placeholder="Optional" />
          </FieldGroup>
        </div>
      </SectionCard>

      <SectionCard
        title="Device"
        description="Store the receipt printer value now and keep the field ready for a future printer picker."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup label="Printer" error={errors.printerName?.message}>
            <Input {...register("printerName")} placeholder="Printer not assigned" />
          </FieldGroup>
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
