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
        posName: terminal.posName,
        registeredName: terminal.registeredName,
        operatedBy: terminal.operatedBy,
        address: terminal.address,
        vatTinNumber: terminal.vatTinNumber,
        vat: terminal.vat,
        discountMax: terminal.discountMax,
        costCenter: terminal.costCenter,
        branchCenter: terminal.branchCenter,
        useCenter: terminal.useCenter,
        dbName: terminal.dbName ?? undefined,
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
      posName: "",
      registeredName: "",
      operatedBy: "",
      address: "",
      vatTinNumber: "",
      vat: 0,
      discountMax: 0,
      costCenter: "",
      branchCenter: "",
      useCenter: "",
      dbName: undefined,
      printerName: "",
    });
  }, [isOpen, terminal, reset]);

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
              <FieldGroup label="POS Name" error={errors.posName?.message}>
                <Input {...register("posName")} placeholder="POS-001" />
              </FieldGroup>
              <FieldGroup label="Registered Name" error={errors.registeredName?.message}>
                <Input {...register("registeredName")} placeholder="Business Name Inc." />
              </FieldGroup>
              <FieldGroup label="Operated By" error={errors.operatedBy?.message}>
                <Input {...register("operatedBy")} placeholder="Operator name" />
              </FieldGroup>
              <FieldGroup label="VAT TIN Number" error={errors.vatTinNumber?.message}>
                <Input {...register("vatTinNumber")} placeholder="000-000-000-000" />
              </FieldGroup>
              <FieldGroup label="VAT (%)" error={errors.vat?.message}>
                <Input type="number" {...register("vat")} placeholder="12" />
              </FieldGroup>
              <FieldGroup label="Max Discount" error={errors.discountMax?.message}>
                <Input type="number" step="0.01" {...register("discountMax")} placeholder="20" />
              </FieldGroup>
              <FieldGroup label="Address" error={errors.address?.message} className="sm:col-span-2">
                <Input {...register("address")} placeholder="Street, City, Province" />
              </FieldGroup>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              System Configuration
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="Cost Center" error={errors.costCenter?.message}>
                <Input {...register("costCenter")} placeholder="COST-001" />
              </FieldGroup>
              <FieldGroup label="Branch Center" error={errors.branchCenter?.message}>
                <Input {...register("branchCenter")} placeholder="BRANCH-001" />
              </FieldGroup>
              <FieldGroup label="Use Center" error={errors.useCenter?.message}>
                <Input {...register("useCenter")} placeholder="USE-001" />
              </FieldGroup>
              <FieldGroup label="DB Name" error={errors.dbName?.message}>
                <Input {...register("dbName")} placeholder="db_pos_001" />
              </FieldGroup>
              <FieldGroup label="Printer Name" error={errors.printerName?.message}>
                <Input {...register("printerName")} placeholder="EPSON-TM20" />
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
