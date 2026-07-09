"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ImageUploadField } from "@/components/storage/ImageUploadField";
import { StorageImage } from "@/components/storage/StorageImage";
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
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<SaleTypeFormValues, unknown, SaleTypeFormInput>({
    resolver: zodResolver(SaleTypeFormSchema),
    defaultValues: {
      name: saleType?.name ?? "",
      account: saleType?.account ?? "",
      paymentQrImageUrl: saleType?.paymentQrImageUrl ?? "",
      paymentAccountHolder: saleType?.paymentAccountHolder ?? "",
      paymentAccountNumber: saleType?.paymentAccountNumber ?? "",
      paymentProviderName: saleType?.paymentProviderName ?? "",
      paymentInstructions: saleType?.paymentInstructions ?? "",
      paymentDisplayEnabled: saleType?.paymentDisplayEnabled ?? false,
      paymentDisplayOrder: saleType?.paymentDisplayOrder ?? null,
    },
  });
  const preview = useWatch({ control });

  useEffect(() => {
    reset({
      name: saleType?.name ?? "",
      account: saleType?.account ?? "",
      paymentQrImageUrl: saleType?.paymentQrImageUrl ?? "",
      paymentAccountHolder: saleType?.paymentAccountHolder ?? "",
      paymentAccountNumber: saleType?.paymentAccountNumber ?? "",
      paymentProviderName: saleType?.paymentProviderName ?? "",
      paymentInstructions: saleType?.paymentInstructions ?? "",
      paymentDisplayEnabled: saleType?.paymentDisplayEnabled ?? false,
      paymentDisplayOrder: saleType?.paymentDisplayOrder ?? null,
    });
  }, [reset, saleType, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
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

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-medium text-amber-800">
            This only displays payment details; POSard does not confirm payment automatically. Cashiers still need to enter the payment reference.
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-5">
              <ImageUploadField
                id="paymentQrImageUrl"
                label="QR Image"
                value={preview.paymentQrImageUrl}
                onChange={(value) =>
                  setValue("paymentQrImageUrl", value ?? "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                purpose="payment-qr"
                ownerId={saleType?.id ?? null}
                disabled={isSubmitting}
                error={errors.paymentQrImageUrl?.message}
                description="Upload the merchant-owned QR customers should scan. JPG, PNG, or WEBP."
                previewClassName="aspect-square max-w-36"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldGroup label="Provider or Bank" error={errors.paymentProviderName?.message}>
                  <Input {...register("paymentProviderName")} placeholder="GCash, Maya, BDO" />
                </FieldGroup>

                <FieldGroup label="Account Holder" error={errors.paymentAccountHolder?.message}>
                  <Input {...register("paymentAccountHolder")} placeholder="Juan Dela Cruz" />
                </FieldGroup>
              </div>

              <FieldGroup label="Account, Mobile, or Username" error={errors.paymentAccountNumber?.message}>
                <Input {...register("paymentAccountNumber")} placeholder="09xx xxx xxxx or account number" />
              </FieldGroup>

              <FieldGroup label="Customer Instructions" error={errors.paymentInstructions?.message}>
                <Input {...register("paymentInstructions")} placeholder="Scan the QR, pay the exact amount, then show the reference." />
              </FieldGroup>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
                <label className="flex min-h-12 items-center gap-3 rounded-lg border p-3">
                  <Checkbox
                    checked={Boolean(preview.paymentDisplayEnabled)}
                    onCheckedChange={(checked) =>
                      setValue("paymentDisplayEnabled", checked === true, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  <span className="text-sm font-medium">Show these details during checkout</span>
                </label>

                <FieldGroup label="Display Priority" error={errors.paymentDisplayOrder?.message}>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    {...register("paymentDisplayOrder")}
                    placeholder="0"
                  />
                </FieldGroup>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Checkout Preview
              </p>
              <div className="mt-3 space-y-3">
                <div className="relative mx-auto flex aspect-square w-full max-w-44 items-center justify-center overflow-hidden rounded-lg border bg-background">
                  <StorageImage
                    src={preview.paymentQrImageUrl}
                    alt="Payment QR preview"
                    fill
                    sizes="176px"
                    className="object-contain"
                    fallback={<span className="px-3 text-center text-xs text-muted-foreground">No QR image</span>}
                  />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {preview.paymentProviderName || preview.name || "Payment method"}
                  </div>
                  {preview.paymentAccountHolder ? (
                    <p className="text-sm text-muted-foreground">{preview.paymentAccountHolder}</p>
                  ) : null}
                  {preview.paymentAccountNumber ? (
                    <p className="break-words text-sm font-medium">{preview.paymentAccountNumber}</p>
                  ) : null}
                  {preview.paymentInstructions ? (
                    <p className="mt-2 text-xs text-muted-foreground">{preview.paymentInstructions}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

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
