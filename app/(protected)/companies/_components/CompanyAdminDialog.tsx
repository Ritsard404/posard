"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploadField } from "@/components/storage/ImageUploadField";
import { businessFitPresetGuides } from "@/app/(protected)/_services/business-fit-presets";
import {
  AdminCompanyUpsertSchema,
  type AdminCompanyUpsertInput,
  type AdminCompanyUpsertPayload,
} from "../_services/_dto/admin-company.dto";
import type { CompanyDTO } from "../[companyId]/_services/company.dto";

interface CompanyAdminDialogProps {
  open: boolean;
  company?: CompanyDTO | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AdminCompanyUpsertInput) => void;
}

export function CompanyAdminDialog({
  open,
  company,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: CompanyAdminDialogProps) {
  const isEdit = Boolean(company);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdminCompanyUpsertPayload, unknown, AdminCompanyUpsertInput>({
    resolver: zodResolver(AdminCompanyUpsertSchema),
  });

  useEffect(() => {
    if (!open) return;

    reset({
      name: company?.name ?? "",
      code: company?.code ?? "",
      email: company?.email ?? "",
      phone: company?.phone ?? "",
      address: company?.address ?? "",
      logoImageUrl: company?.logoImageUrl ?? "",
      businessTypePreset: company?.businessTypePreset ?? "RETAIL",
    });
  }, [company, open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Company" : "Create Company"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update company profile details." : "Add a new company to the workspace."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Company Name" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Acme Stores" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" error={errors.code?.message}>
              <Input {...register("code")} placeholder="ACME-001" />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="+63 900 000 0000" />
            </Field>
          </div>
          <Field label="Email" error={errors.email?.message}>
            <Input {...register("email")} type="email" placeholder="owner@company.com" />
          </Field>
          <Field label="Address" error={errors.address?.message}>
            <Input {...register("address")} placeholder="Street, City, Province" />
          </Field>
          <Field label="Business Type" error={errors.businessTypePreset?.message}>
            <select
              {...register("businessTypePreset")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {businessFitPresetGuides.map((guide) => (
                <option key={guide.preset} value={guide.preset}>
                  {guide.label}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <input type="hidden" {...register("logoImageUrl")} />
            <ImageUploadField
              id="admin-company-logo"
              label="Company Logo"
              purpose="company-logo"
              ownerId={company?.id ?? null}
              value={watch("logoImageUrl")}
              disabled={isSubmitting}
              error={errors.logoImageUrl?.message}
              onChange={(value) => {
                setValue("logoImageUrl", value ?? undefined, { shouldDirty: true, shouldValidate: true });
              }}
              description="Upload the logo used across company views."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : isEdit ? "Save Changes" : "Create Company"}
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
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
