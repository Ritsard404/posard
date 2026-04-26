"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
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
  SaleTypeFormSchema,
  type SaleTypeFormInput,
  type SaleTypeListItemDTO,
} from "../_services/sale-type.dto";

type SaleTypeFormValues = z.input<typeof SaleTypeFormSchema>;

interface SaleTypeDialogProps {
  open: boolean;
  saleType: SaleTypeListItemDTO | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SaleTypeFormInput) => void;
}

export function SaleTypeDialog({
  open,
  saleType,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: SaleTypeDialogProps) {
  const isEditing = Boolean(saleType);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SaleTypeFormValues, unknown, SaleTypeFormInput>({
    resolver: zodResolver(SaleTypeFormSchema),
    defaultValues: {
      name: saleType?.name ?? "",
      account: saleType?.account ?? "",
    },
  });

  useEffect(() => {
    reset({
      name: saleType?.name ?? "",
      account: saleType?.account ?? "",
    });
  }, [reset, saleType, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit sales account" : "Add sales account"}</DialogTitle>
          <DialogDescription>
            These payment methods are used by POS reference payments such as GCash, Maya, card, and bank transfer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FieldGroup label="Payment Method" error={errors.name?.message} required>
            <Input {...register("name")} placeholder="GCash" />
          </FieldGroup>

          <FieldGroup label="Sales Account" error={errors.account?.message}>
            <Input {...register("account")} placeholder="Cashless Sales" />
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isDirty && isEditing)}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? "Save Changes" : "Create Method"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({
  label,
  error,
  children,
  required = false,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
