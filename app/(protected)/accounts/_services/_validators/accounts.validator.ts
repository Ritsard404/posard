import { z } from "zod";

const nullableTextInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (value === "") {
      return undefined;
    }

    return value;
  }, schema.optional());

export const GetAccountsSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional(),
  status: emptyStringToUndefined(
    z.enum(["pending", "active", "disabled"]),
  ),
  role: emptyStringToUndefined(z.enum(["manager", "cashier"])),
  companyId: emptyStringToUndefined(z.string().uuid()),
});

export const CreateAccountSchema = z.object({
  email: z.string().trim().email("A valid email is required"),
  fullName: nullableTextInput,
  role: z.enum(["manager", "cashier"]),
  companyId: z.string().uuid("A valid company is required"),
});

export const UpdateAccountSchema = z.object({
  fullName: nullableTextInput,
  companyId: z.string().uuid("A valid company is required"),
});

export const UpdateOwnProfileSchema = z.object({
  fullName: nullableTextInput,
});

export const AccountIdSchema = z.string().uuid("A valid account is required");

export type GetAccountsInput = z.infer<typeof GetAccountsSchema>;
export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
export type UpdateOwnProfileInput = z.infer<typeof UpdateOwnProfileSchema>;
