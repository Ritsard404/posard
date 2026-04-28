import { z } from "zod";

const nullableTextInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

export const SubmitRegistrationRequestSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  email: z.string().trim().email("A valid email is required").max(320),
  phone: nullableTextInput,
  companyName: nullableTextInput,
  requestedRole: z.enum(["manager"]).default("manager"),
});

export const RegistrationRequestEmailSchema = z.object({
  email: z.string().trim().email("A valid email is required").max(320),
});

export type SubmitRegistrationRequestInput = z.infer<
  typeof SubmitRegistrationRequestSchema
>;
