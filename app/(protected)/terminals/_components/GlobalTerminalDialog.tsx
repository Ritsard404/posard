"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VatRegistrationToggle } from "@/components/vat-registration-toggle";
import { CreateTerminalSchema, type CreateTerminalPayload, type TerminalDTO } from "@/app/(protected)/companies/[companyId]/_services/terminal.dto";

const GlobalTerminalFormSchema = CreateTerminalSchema.extend({
  companyId: z.string().uuid("Company is required"),
});

type GlobalTerminalFormValues = z.input<typeof GlobalTerminalFormSchema>;

interface GlobalTerminalDialogProps {
  open: boolean;
  terminal?: TerminalDTO | null;
  companyId?: string | null;
  companyOptions: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (companyId: string, values: CreateTerminalPayload) => void;
}

export function GlobalTerminalDialog({
  open,
  terminal,
  companyId,
  companyOptions,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: GlobalTerminalDialogProps) {
  const isEdit = Boolean(terminal);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GlobalTerminalFormValues>({
    resolver: zodResolver(GlobalTerminalFormSchema),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      companyId: terminal?.companyId ?? companyId ?? companyOptions[0]?.id ?? "",
      minNumber: terminal?.minNumber ?? "",
      accreditationNumber: terminal?.accreditationNumber ?? "",
      ptuNumber: terminal?.ptuNumber ?? "",
      dateIssued: terminal ? toDateInputValue(terminal.dateIssued) : "",
      validUntil: terminal ? toDateInputValue(terminal.validUntil) : "",
      operatedBy: terminal?.operatedBy ?? "",
      vatTinNumber: terminal?.vatTinNumber ?? "",
      vat: terminal?.vat ?? 0,
      discountCapType: terminal?.discountCapType ?? "amount",
      discountMax: terminal?.discountMax ?? undefined,
      printerName: terminal?.printerName ?? "",
    });
  }, [companyId, companyOptions, open, reset, terminal]);

  const discountCapType = watch("discountCapType");
  const isVatRegistered = Number(watch("vat") ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Terminal" : "Create Terminal"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update terminal registration and company details." : "Register a terminal under a company."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => {
            const { companyId: selectedCompanyId, ...payload } = values;
            onSubmit(selectedCompanyId, payload);
          })}
          className="space-y-6"
        >
          <Field label="Company" error={errors.companyId?.message}>
            <select
              {...register("companyId")}
              disabled={isEdit}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {companyOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>

          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="MIN Number" error={errors.minNumber?.message}>
              <Input {...register("minNumber")} />
            </Field>
            <Field label="Accreditation Number" error={errors.accreditationNumber?.message}>
              <Input {...register("accreditationNumber")} />
            </Field>
            <Field label="PTU Number" error={errors.ptuNumber?.message}>
              <Input {...register("ptuNumber")} />
            </Field>
            <Field label="Date Issued" error={errors.dateIssued?.message}>
              <Input type="date" {...register("dateIssued")} />
            </Field>
            <Field label="Valid Until" error={errors.validUntil?.message}>
              <Input type="date" {...register("validUntil")} />
            </Field>
            <Field label="Operated By" error={errors.operatedBy?.message}>
              <Input {...register("operatedBy")} />
            </Field>
            <input type="hidden" {...register("vat")} />
            <Field label="VAT Registration" error={errors.vat?.message}>
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
            </Field>
            <Field label="VAT TIN" error={errors.vatTinNumber?.message}>
              <Input
                {...register("vatTinNumber")}
                disabled={!isVatRegistered || isSubmitting}
                placeholder={isVatRegistered ? "000-000-000-000" : "None"}
              />
            </Field>
            <Field label="Discount Cap Type" error={errors.discountCapType?.message}>
              <select
                {...register("discountCapType")}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="amount">Amount</option>
                <option value="percent">Percent</option>
              </select>
            </Field>
            <Field
              label={discountCapType === "percent" ? "Discount Cap (%)" : "Discount Cap Amount"}
              error={errors.discountMax?.message}
            >
              <Input type="number" min="0" step="0.01" {...register("discountMax")} />
            </Field>
            <Field label="Printer Name" error={errors.printerName?.message}>
              <Input {...register("printerName")} />
            </Field>
          </section>

          <p className="text-xs text-muted-foreground">
            {discountCapType === "percent"
              ? "This terminal will apply Max Discount as a percentage cap."
              : "This terminal will apply Max Discount as a fixed amount cap."}
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : isEdit ? "Save Changes" : "Create Terminal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function toDateInputValue(value: Date | string) {
  return new Date(value).toISOString().split("T")[0];
}
