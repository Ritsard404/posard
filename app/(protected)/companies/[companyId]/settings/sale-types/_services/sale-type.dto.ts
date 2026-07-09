import { z } from "zod";

export const SaleTypeFormSchema = z.object({
  name: z.string().trim().min(1, "Payment method name is required").max(80, "Payment method name is too long"),
  account: z
    .string()
    .trim()
    .max(120, "Sales account is too long")
    .optional()
    .transform((value) => value ?? ""),
  paymentQrImageUrl: z
    .string()
    .trim()
    .max(500, "QR image reference is too long")
    .optional()
    .nullable()
    .transform((value) => value ?? ""),
  paymentAccountHolder: z
    .string()
    .trim()
    .max(160, "Account holder is too long")
    .optional()
    .transform((value) => value ?? ""),
  paymentAccountNumber: z
    .string()
    .trim()
    .max(240, "Account detail is too long")
    .optional()
    .transform((value) => value ?? ""),
  paymentProviderName: z
    .string()
    .trim()
    .max(120, "Provider name is too long")
    .optional()
    .transform((value) => value ?? ""),
  paymentInstructions: z
    .string()
    .trim()
    .max(500, "Instructions are too long")
    .optional()
    .transform((value) => value ?? ""),
  paymentDisplayEnabled: z.boolean().default(false),
  paymentDisplayOrder: z.coerce
    .number()
    .int("Display priority must be a whole number")
    .min(0, "Display priority cannot be negative")
    .max(999, "Display priority is too high")
    .optional()
    .nullable()
    .transform((value) => value ?? null),
});

export type SaleTypeFormInput = z.output<typeof SaleTypeFormSchema>;

export interface SaleTypeListItemDTO {
  id: string;
  name: string;
  account: string | null;
  paymentQrImageUrl: string | null;
  paymentAccountHolder: string | null;
  paymentAccountNumber: string | null;
  paymentProviderName: string | null;
  paymentInstructions: string | null;
  paymentDisplayEnabled: boolean;
  paymentDisplayOrder: number | null;
  paymentDetailsUpdatedAt: string | null;
  paymentCount: number;
}
