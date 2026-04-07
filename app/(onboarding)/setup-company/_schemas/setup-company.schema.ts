import { z } from "zod";

export const setupCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(100),
  code: z.string().max(20).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^09\d{9}$/, "Phone number must start with 09 and be 11 digits")
    .optional()
    .or(z.literal("")),
  logoImageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

// ✅ Inferred type — no need to manually write SetupCompanyInput
export type SetupCompanyInput = z.infer<typeof setupCompanySchema>;
