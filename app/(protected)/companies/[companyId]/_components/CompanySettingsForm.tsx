"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploadField } from "@/components/storage/ImageUploadField";
import {
  businessFitPresetGuides,
  getBusinessFitPresetGuide,
} from "@/app/(protected)/_services/business-fit-presets";
import {
  UpdateCompanySchema,
  type CompanyDetailDTO,
  type UpdateCompanyInput,
} from "../_services/company.dto";

type UpdateCompanyFormValues = z.input<typeof UpdateCompanySchema>;

interface CompanySettingsFormProps {
  company: CompanyDetailDTO;
  isSubmitting?: boolean;
  onSubmit: (data: UpdateCompanyInput) => void;
}

export default function CompanySettingsForm({
  company,
  isSubmitting = false,
  onSubmit,
}: CompanySettingsFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateCompanyFormValues, unknown, UpdateCompanyInput>({
    resolver: zodResolver(UpdateCompanySchema),
    defaultValues: {
      name: company.name,
      code: company.code ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      address: company.address ?? "",
      logoImageUrl: company.logoImageUrl ?? "",
      businessTypePreset: company.businessTypePreset,
    },
  });
  const logoImageUrl = watch("logoImageUrl") as string | null | undefined;
  const selectedGuide = getBusinessFitPresetGuide(watch("businessTypePreset") ?? "RETAIL");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FieldGroup label="Company Name" error={errors.name?.message} required>
          <Input {...register("name")} placeholder="Acme Corp" className="focus:border-blue-500" />
        </FieldGroup>

        <FieldGroup label="Company Code" error={errors.code?.message}>
          <Input {...register("code")} placeholder="ACME-001" className="focus:border-blue-500" />
        </FieldGroup>

        <FieldGroup label="Email Address" error={errors.email?.message}>
          <Input
            {...register("email")}
            type="email"
            placeholder="admin@company.com"
            className="focus:border-blue-500"
          />
        </FieldGroup>

        <FieldGroup label="Phone Number" error={errors.phone?.message}>
          <Input
            {...register("phone")}
            placeholder="+63 900 000 0000"
            className="focus:border-blue-500"
          />
        </FieldGroup>

        <FieldGroup label="Address" error={errors.address?.message} className="sm:col-span-2">
          <Input
            {...register("address")}
            placeholder="Street, City, Province"
            className="focus:border-blue-500"
          />
        </FieldGroup>

        <FieldGroup label="Business Type" error={errors.businessTypePreset?.message} className="sm:col-span-2">
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
          {selectedGuide ? (
            <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{selectedGuide.description}</div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <PresetHint title="Setup" items={selectedGuide.setupSteps} />
                <PresetHint title="Terminal" items={selectedGuide.terminalToggles} />
                <PresetHint title="Inventory" items={selectedGuide.inventoryDefaults} />
              </div>
            </div>
          ) : null}
        </FieldGroup>

        <div className="sm:col-span-2">
          <input type="hidden" {...register("logoImageUrl")} />
          <ImageUploadField
            id="company-logo-image"
            label="Company Logo"
            purpose="company-logo"
            ownerId={company.id}
            value={logoImageUrl}
            disabled={isSubmitting}
            error={errors.logoImageUrl?.message}
            onChange={(value) => {
              setValue("logoImageUrl", value, { shouldDirty: true, shouldValidate: true });
            }}
            description="Upload the logo used in company and account views."
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting || !isDirty} className="min-w-[140px]">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function PresetHint({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</div>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {items.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function FieldGroup({
  label,
  error,
  children,
  className = "",
  required = false,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
