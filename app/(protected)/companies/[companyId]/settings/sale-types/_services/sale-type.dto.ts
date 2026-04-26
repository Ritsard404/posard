import { z } from "zod";

export const SaleTypeFormSchema = z.object({
  name: z.string().trim().min(1, "Payment method name is required").max(80, "Payment method name is too long"),
  account: z
    .string()
    .trim()
    .max(120, "Sales account is too long")
    .optional()
    .transform((value) => value ?? ""),
});

export type SaleTypeFormInput = z.output<typeof SaleTypeFormSchema>;

export interface SaleTypeListItemDTO {
  id: string;
  name: string;
  account: string | null;
  paymentCount: number;
}
