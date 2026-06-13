import { z } from "zod";

const nullableTextInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const nullableEmailInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().email("Invalid email").nullable());

export const BranchSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  isActive: z.boolean(),
  managerId: z.string().uuid().nullable(),
  managerName: z.string().nullable(),
  timezone: z.string().nullable(),
  currency: z.string().nullable(),
  taxMode: z.string().nullable(),
  taxRate: z.number().nullable(),
  receiptFooter: z.string().nullable(),
  logoImageUrl: z.string().nullable(),
  openingDate: z.date().nullable(),
  invoicePrefix: z.string().nullable(),
  activeCashierCount: z.number().int().min(0),
  activeTerminalCount: z.number().int().min(0),
  todaySales: z.number().min(0),
  todayTransactions: z.number().int().min(0),
  pendingDebtCount: z.number().int().min(0),
  lowStockCount: z.number().int().min(0),
  companyId: z.string().uuid(),
  cashierCount: z.number().int().min(0),
  terminalCount: z.number().int().min(0),
  invoiceCount: z.number().int().min(0),
  totalSales: z.number().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BranchDTO = z.infer<typeof BranchSchema>;

export interface BranchManagerOptionDTO {
  id: string;
  name: string;
  email: string;
}

export const BranchUpsertSchema = z.object({
  name: z.string().trim().min(2, "Branch name must be at least 2 characters").max(120),
  code: nullableTextInput,
  address: nullableTextInput,
  phone: nullableTextInput,
  email: nullableEmailInput,
  managerId: nullableTextInput,
  timezone: nullableTextInput.default("Asia/Manila"),
  currency: nullableTextInput.default("PHP"),
  taxMode: z.enum(["inherit", "override"]).default("inherit"),
  taxRate: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    return value;
  }, z.coerce.number().min(0).max(100).nullable()),
  receiptFooter: nullableTextInput,
  logoImageUrl: nullableTextInput,
  openingDate: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }, z.date().nullable()),
  invoicePrefix: nullableTextInput,
  isActive: z.boolean().optional(),
});

export const AssignCashierBranchSchema = z.object({
  profileId: z.string().uuid("A valid cashier is required"),
  branchId: z.string().uuid("A valid branch is required").nullable(),
});

export type BranchUpsertInput = z.infer<typeof BranchUpsertSchema>;
export type AssignCashierBranchInput = z.infer<typeof AssignCashierBranchSchema>;
