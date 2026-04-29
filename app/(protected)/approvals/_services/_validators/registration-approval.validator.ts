import { z } from "zod";

const nullableTextInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().max(300).nullable());

export const RegistrationRequestIdSchema = z.string().uuid(
  "A valid registration request is required",
);

export const RejectRegistrationRequestSchema = z.object({
  rejectionReason: nullableTextInput,
});

export const ApproveRegistrationRequestSchema = z.object({
  password: z
    .string()
    .trim()
    .min(4, "Password must be at least 4 characters")
    .max(72, "Password must be 72 characters or fewer"),
});
