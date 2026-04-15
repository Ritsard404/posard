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
      posName: terminal?.posName ?? "",
      registeredName: terminal?.registeredName ?? "",
      operatedBy: terminal?.operatedBy ?? "",
      address: terminal?.address ?? "",
      vatTinNumber: terminal?.vatTinNumber ?? "",
      vat: terminal?.vat ?? 0,
      discountMax: terminal?.discountMax ?? 0,
      costCenter: terminal?.costCenter ?? "",
      branchCenter: terminal?.branchCenter ?? "",
      useCenter: terminal?.useCenter ?? "",
      dbName: terminal?.dbName ?? undefined,
      printerName: terminal?.printerName ?? "",
    });
  }, [companyId, companyOptions, open, reset, terminal]);

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
            <Field label="POS Name" error={errors.posName?.message}>
              <Input {...register("posName")} />
            </Field>
            <Field label="Registered Name" error={errors.registeredName?.message}>
              <Input {...register("registeredName")} />
            </Field>
            <Field label="Operated By" error={errors.operatedBy?.message}>
              <Input {...register("operatedBy")} />
            </Field>
            <Field label="VAT TIN" error={errors.vatTinNumber?.message}>
              <Input {...register("vatTinNumber")} />
            </Field>
            <Field label="VAT" error={errors.vat?.message}>
              <Input type="number" {...register("vat")} />
            </Field>
            <Field label="Discount Max" error={errors.discountMax?.message}>
              <Input type="number" step="0.01" {...register("discountMax")} />
            </Field>
            <Field label="Printer Name" error={errors.printerName?.message}>
              <Input {...register("printerName")} />
            </Field>
            <Field label="Address" error={errors.address?.message} className="sm:col-span-2">
              <Input {...register("address")} />
            </Field>
            <Field label="Cost Center" error={errors.costCenter?.message}>
              <Input {...register("costCenter")} />
            </Field>
            <Field label="Branch Center" error={errors.branchCenter?.message}>
              <Input {...register("branchCenter")} />
            </Field>
            <Field label="Use Center" error={errors.useCenter?.message}>
              <Input {...register("useCenter")} />
            </Field>
            <Field label="DB Name" error={errors.dbName?.message}>
              <Input {...register("dbName")} />
            </Field>
          </section>

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

