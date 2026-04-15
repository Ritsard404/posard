"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    formState: { errors, isDirty },
  } = useForm<UpdateCompanyFormValues, unknown, UpdateCompanyInput>({
    resolver: zodResolver(UpdateCompanySchema),
    defaultValues: {
      name: company.name,
      code: company.code ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      logoImageUrl: company.logoImageUrl ?? "",
    },
  });

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

        <FieldGroup
          label="Logo Image URL"
          error={errors.logoImageUrl?.message}
          className="sm:col-span-2"
        >
          <Input
            {...register("logoImageUrl")}
            placeholder="https://cdn.example.com/logo.png"
            className="focus:border-blue-500"
          />
        </FieldGroup>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting || !isDirty} className="min-w-[140px]">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
        </Button>
      </div>
    </form>
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
