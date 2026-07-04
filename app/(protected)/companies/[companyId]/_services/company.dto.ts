import { z } from "zod";
import { businessTypePresets } from "@/app/(protected)/_services/business-fit-presets";

const nullableTextInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const nullableImagePathInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().max(500, "Logo path is too long").nullable());

const nullableEmailInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().email("Invalid email").nullable());

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  code: z.string().nullable(),
  email: z.string().email("Invalid email").nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  logoImageUrl: z.string().nullable(),
  businessTypePreset: z.enum(businessTypePresets).default("RETAIL"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CompanyDTO = z.infer<typeof CompanySchema>;

export const CompanyListItemSchema = CompanySchema.extend({
  terminalCount: z.number().int().min(0),
  pendingTerminalRequestCount: z.number().int().min(0),
});

export type CompanyListItemDTO = z.infer<typeof CompanyListItemSchema>;

export const CompanyDetailSchema = CompanySchema.extend({
  terminalCount: z.number().int().min(0),
  activeTerminalCount: z.number().int().min(0),
  activeSubscriptionCount: z.number().int().min(0),
  pendingTerminalRequestCount: z.number().int().min(0),
});

export type CompanyDetailDTO = z.infer<typeof CompanyDetailSchema>;

export const UpdateCompanySchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: nullableTextInput.optional(),
  email: nullableEmailInput.optional(),
  phone: nullableTextInput.optional(),
  address: nullableTextInput.optional(),
  logoImageUrl: nullableImagePathInput.optional(),
  businessTypePreset: z.enum(businessTypePresets).optional(),
});

export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
