import { z } from "zod";
import { PaginationQuerySchema } from "./common.dto";
import { businessTypePresets } from "@/app/(protected)/_services/business-fit-presets";

export const CompanyAdminListQuerySchema = PaginationQuerySchema;

export type CompanyAdminListQueryInput = z.input<typeof CompanyAdminListQuerySchema>;
export type CompanyAdminListQuery = z.infer<typeof CompanyAdminListQuerySchema>;

export interface AdminCompanyListItemDto {
  id: string;
  name: string;
  email: string | null;
  code: string | null;
  phone: string | null;
  address: string | null;
  logoImageUrl: string | null;
  businessTypePreset: (typeof businessTypePresets)[number];
  ownerManagerName: string | null;
  ownerManagerEmail: string | null;
  createdAt: Date;
  terminalCount: number;
  activeTerminalCount: number;
  activeSubscriptionCount: number;
  pendingTerminalRequestCount: number;
}

export const AdminCompanyUpsertSchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  code: z.string().trim().optional().transform((value) => value || null),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || /\S+@\S+\.\S+/.test(value), "Invalid email"),
  phone: z.string().trim().optional().transform((value) => value || null),
  address: z.string().trim().optional().transform((value) => value || null),
  logoImageUrl: z.string().trim().optional().transform((value) => value || null),
  businessTypePreset: z.enum(businessTypePresets).default("RETAIL"),
});

export type AdminCompanyUpsertInput = z.infer<typeof AdminCompanyUpsertSchema>;
export type AdminCompanyUpsertPayload = z.input<typeof AdminCompanyUpsertSchema>;
