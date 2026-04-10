"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, X } from "lucide-react";
import {
  CreateTerminalSchema,
  type CreateTerminalInput,
  type TerminalDTO,
} from "../_services/terminal.dto";

interface TerminalFormModalProps {
  // Si se pasa un terminal, es modo edición; si no, es modo creación
  terminal?: TerminalDTO;
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTerminalInput) => void;
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
  } = useForm<CreateTerminalInput>({
    resolver: zodResolver(
      CreateTerminalSchema,
    ) as Resolver<CreateTerminalInput>,
    defaultValues: terminal
      ? {
          ...terminal,
          dateIssued: new Date(terminal.dateIssued),
          validUntil: new Date(terminal.validUntil),
          discountMax: terminal.discountMax,
          dbName: terminal.dbName ?? undefined,
        }
      : undefined,
  });

  // Sincronizar el formulario cuando cambia el terminal seleccionado
  useEffect(() => {
    if (terminal) {
      reset({
        ...terminal,
        dateIssued: new Date(terminal.dateIssued),
        validUntil: new Date(terminal.validUntil),
        discountMax: terminal.discountMax,
        dbName: terminal.dbName ?? undefined,
      });
    } else {
      reset({});
    }
  }, [terminal, reset]);

  if (!isOpen) return null;

  const toDateInputValue = (val: Date | string | undefined) => {
    if (!val) return "";
    return new Date(val).toISOString().split("T")[0];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditMode ? "Edit Terminal" : "Add Terminal"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            type="button"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Sección: Información regulatoria */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
              Regulatory Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup label="MIN Number" error={errors.minNumber?.message}>
                <Input {...register("minNumber")} placeholder="MIN-0000" />
              </FieldGroup>
              <FieldGroup
                label="Accreditation Number"
                error={errors.accreditationNumber?.message}
              >
                <Input
                  {...register("accreditationNumber")}
                  placeholder="ACCR-0000"
                />
              </FieldGroup>
              <FieldGroup label="PTU Number" error={errors.ptuNumber?.message}>
                <Input {...register("ptuNumber")} placeholder="PTU-0000" />
              </FieldGroup>
              <FieldGroup
                label="Date Issued"
                error={errors.dateIssued?.message}
              >
                <Input
                  type="date"
                  {...register("dateIssued")}
                  defaultValue={toDateInputValue(terminal?.dateIssued)}
                />
              </FieldGroup>
              <FieldGroup
                label="Valid Until"
                error={errors.validUntil?.message}
              >
                <Input
                  type="date"
                  {...register("validUntil")}
                  defaultValue={toDateInputValue(terminal?.validUntil)}
                />
              </FieldGroup>
            </div>
          </div>

          {/* Sección: Información del negocio */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
              Business Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup label="POS Name" error={errors.posName?.message}>
                <Input {...register("posName")} placeholder="POS-001" />
              </FieldGroup>
              <FieldGroup
                label="Registered Name"
                error={errors.registeredName?.message}
              >
                <Input
                  {...register("registeredName")}
                  placeholder="Business Name Inc."
                />
              </FieldGroup>
              <FieldGroup
                label="Operated By"
                error={errors.operatedBy?.message}
              >
                <Input
                  {...register("operatedBy")}
                  placeholder="Operator name"
                />
              </FieldGroup>
              <FieldGroup
                label="VAT TIN Number"
                error={errors.vatTinNumber?.message}
              >
                <Input
                  {...register("vatTinNumber")}
                  placeholder="000-000-000-000"
                />
              </FieldGroup>
              <FieldGroup label="VAT (%)" error={errors.vat?.message}>
                <Input type="number" {...register("vat")} placeholder="12" />
              </FieldGroup>
              <FieldGroup
                label="Max Discount"
                error={errors.discountMax?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  {...register("discountMax")}
                  placeholder="20"
                />
              </FieldGroup>
              <FieldGroup
                label="Address"
                error={errors.address?.message}
                className="sm:col-span-2"
              >
                <Input
                  {...register("address")}
                  placeholder="Street, City, Province"
                />
              </FieldGroup>
            </div>
          </div>

          {/* Sección: Configuración del sistema */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
              System Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup
                label="Cost Center"
                error={errors.costCenter?.message}
              >
                <Input {...register("costCenter")} placeholder="COST-001" />
              </FieldGroup>
              <FieldGroup
                label="Branch Center"
                error={errors.branchCenter?.message}
              >
                <Input {...register("branchCenter")} placeholder="BRANCH-001" />
              </FieldGroup>
              <FieldGroup label="Use Center" error={errors.useCenter?.message}>
                <Input {...register("useCenter")} placeholder="USE-001" />
              </FieldGroup>
              <FieldGroup
                label="DB Name (optional)"
                error={errors.dbName?.message}
              >
                <Input {...register("dbName")} placeholder="db_pos_001" />
              </FieldGroup>
              <FieldGroup
                label="Printer Name"
                error={errors.printerName?.message}
              >
                <Input {...register("printerName")} placeholder="EPSON-TM20" />
              </FieldGroup>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Create Terminal"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Componente auxiliar para agrupar campo y su error
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
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
