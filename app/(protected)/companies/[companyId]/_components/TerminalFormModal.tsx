"use client";

import { useEffect } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreateTerminalSchema,
  type CreateTerminalPayload,
  type TerminalDTO,
} from "../_services/terminal.dto";

interface TerminalFormModalProps {
  terminal?: TerminalDTO;
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTerminalPayload) => void;
}

export default function TerminalFormModal({
  terminal,
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}: TerminalFormModalProps) {
  const isEditMode = Boolean(terminal);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateTerminalPayload>({
    resolver: zodResolver(CreateTerminalSchema) as Resolver<CreateTerminalPayload>,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (terminal) {
      reset({
        minNumber: terminal.minNumber,
        accreditationNumber: terminal.accreditationNumber,
        ptuNumber: terminal.ptuNumber,
        dateIssued: toDateInputValue(terminal.dateIssued),
        validUntil: toDateInputValue(terminal.validUntil),
        operatedBy: terminal.operatedBy,
        vatTinNumber: terminal.vatTinNumber,
        vat: terminal.vat ?? undefined,
        discountCapType: terminal.discountCapType,
        discountMax: terminal.discountMax ?? undefined,
        printerName: terminal.printerName,
      });
      return;
    }

    reset({
      minNumber: "",
      accreditationNumber: "",
      ptuNumber: "",
      dateIssued: "",
      validUntil: "",
      operatedBy: "",
      vatTinNumber: "",
      vat: undefined,
      discountCapType: "amount",
      discountMax: undefined,
      printerName: "",
    });
  }, [isOpen, terminal, reset]);

  const discountCapType = watch("discountCapType");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Terminal" : "Add Terminal"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update terminal registration, business, and system fields."
              : "Register a new terminal for this company."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Regulatory Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="MIN Number" error={errors.minNumber?.message}>
                <Input {...register("minNumber")} placeholder="MIN-0000" />
              </FieldGroup>
              <FieldGroup label="Accreditation Number" error={errors.accreditationNumber?.message}>
                <Input {...register("accreditationNumber")} placeholder="ACCR-0000" />
              </FieldGroup>
              <FieldGroup label="PTU Number" error={errors.ptuNumber?.message}>
                <Input {...register("ptuNumber")} placeholder="PTU-0000" />
              </FieldGroup>
              <FieldGroup label="Date Issued" error={errors.dateIssued?.message}>
                <Input type="date" {...register("dateIssued")} />
              </FieldGroup>
              <FieldGroup label="Valid Until" error={errors.validUntil?.message}>
                <Input type="date" {...register("validUntil")} />
              </FieldGroup>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Business Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="Operated By" error={errors.operatedBy?.message}>
                <Input {...register("operatedBy")} placeholder="Operator name" />
              </FieldGroup>
              <FieldGroup label="VAT TIN Number" error={errors.vatTinNumber?.message}>
                <Input {...register("vatTinNumber")} placeholder="000-000-000-000" />
              </FieldGroup>
              <FieldGroup label="VAT (%)" error={errors.vat?.message}>
                <PercentInput {...register("vat")} placeholder="Optional" />
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
                  placeholder={discountCapType === "percent" ? "Optional percent" : "Optional amount"}
                />
              </FieldGroup>
            </div>
            <p className="text-xs text-muted-foreground">
              {discountCapType === "percent"
                ? "Percent cap keeps Max Discount limited by percentage."
                : "Amount cap keeps Max Discount limited by fixed peso amount."}
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              System Configuration
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="Printer Name" error={errors.printerName?.message}>
                <Input {...register("printerName")} placeholder="Optional" />
              </FieldGroup>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Create Terminal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDateInputValue(value: Date | string) {
  return new Date(value).toISOString().split("T")[0];
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
