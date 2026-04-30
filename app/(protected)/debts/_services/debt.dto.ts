import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required"),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const recordDebtPaymentSchema = z.object({
  debtId: z.string().uuid(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  method: z.string().trim().min(1, "Payment method is required"),
  referenceNo: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  timestampId: z.string().uuid().optional().nullable(),
});

export const debtListFiltersSchema = z.object({
  status: z.enum(["UNPAID", "PARTIAL", "PAID", "CANCELLED", "ALL"]).default("ALL"),
  customerId: z.string().uuid().optional().nullable(),
  terminalId: z.string().uuid().optional().nullable(),
  query: z.string().trim().optional().default(""),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type RecordDebtPaymentInput = z.infer<typeof recordDebtPaymentSchema>;
export type DebtListFiltersInput = z.infer<typeof debtListFiltersSchema>;

export type CustomerListItemDto = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
};

export type DebtListItemDto = {
  id: string;
  invoiceId: string;
  invoiceNumber: number;
  customerId: string;
  customerName: string;
  terminalName: string;
  createdByName: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: "UNPAID" | "PARTIAL" | "PAID" | "CANCELLED";
  dueDate: string;
  createdAt: string;
  paidAt: string | null;
  notes: string | null;
};

export type DebtPaymentHistoryItemDto = {
  id: string;
  amount: number;
  method: string;
  referenceNo: string | null;
  notes: string | null;
  receivedByName: string;
  createdAt: string;
};

export type DebtDashboardSummaryDto = {
  totalOutstanding: number;
  dueToday: number;
  overdue: number;
  collectedToday: number;
  activeCustomers: number;
};

export type DebtWorkspaceDto = {
  summary: DebtDashboardSummaryDto;
  items: DebtListItemDto[];
  customers: CustomerListItemDto[];
};
