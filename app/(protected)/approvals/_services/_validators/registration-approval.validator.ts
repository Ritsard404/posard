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
