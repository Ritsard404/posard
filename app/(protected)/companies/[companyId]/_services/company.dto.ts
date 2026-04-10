import { z } from "zod";

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  code: z.string().nullable(),
  email: z.string().email("Invalid email").nullable(),
  phone: z.string().nullable(),
  logoImageUrl: z.string().nullable(),
  isApproved: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CompanyDTO = z.infer<typeof CompanySchema>;

export const UpdateCompanySchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z.string().nullable().optional(),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: z.string().nullable().optional(),
  logoImageUrl: z.string().nullable().optional(),
});

export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
