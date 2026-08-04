import { z } from "zod";
import { businessTypePresets } from "@/app/(protected)/_services/business-fit-presets";

const nullableUuidInput = z.preprocess((value) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().uuid().nullable());

const nullableTextInput = z.preprocess((value) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const nullableDateInput = z.preprocess((value) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? new Date(trimmed) : null;
}, z.date().nullable());

const optionalMoneyInput = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return 0;
  return value;
}, z.coerce.number().min(0));

const optionalPositiveQuantityInput = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  return value;
}, z.coerce.number().positive().nullable());

export const ServiceBookingCreateSchema = z.object({
  idempotencyKey: z.string().uuid(),
  customerId: nullableUuidInput,
  serviceProductId: nullableUuidInput,
  assignedStaffId: nullableUuidInput,
  terminalId: nullableUuidInput,
  scheduledStart: z.coerce.date(),
  scheduledEnd: nullableDateInput,
  depositAmount: optionalMoneyInput,
  finalAmount: optionalMoneyInput.optional(),
  notes: nullableTextInput,
});

export type ServiceBookingCreateInput = z.infer<typeof ServiceBookingCreateSchema>;

export const RepairJobCreateSchema = z.object({
  idempotencyKey: z.string().uuid(),
  customerId: nullableUuidInput,
  terminalId: nullableUuidInput,
  laborProductId: nullableUuidInput,
  assignedStaffId: nullableUuidInput,
  itemLabel: z.string().min(1, "Item or device is required"),
  serialReference: nullableTextInput,
  issueSummary: z.string().min(1, "Issue summary is required"),
  intakeNotes: nullableTextInput.optional(),
  estimateAmount: optionalMoneyInput.optional(),
  depositAmount: optionalMoneyInput,
  dueDate: nullableDateInput,
  warrantyUntil: nullableDateInput.optional(),
  notes: nullableTextInput.optional(),
});

export type RepairJobCreateInput = z.infer<typeof RepairJobCreateSchema>;

export const SalesOrderCreateSchema = z.object({
  idempotencyKey: z.string().uuid(),
  customerId: nullableUuidInput,
  terminalId: nullableUuidInput,
  productId: nullableUuidInput,
  quoteValidUntil: nullableDateInput,
  paymentTermsDays: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    return value;
  }, z.coerce.number().int().min(0).max(365).nullable()),
  quantity: optionalPositiveQuantityInput,
  unitPrice: optionalMoneyInput,
  discountAmount: optionalMoneyInput,
  deliveryStatus: nullableTextInput,
  deliveryNotes: nullableTextInput.optional(),
  notes: nullableTextInput,
});

export type SalesOrderCreateInput = z.infer<typeof SalesOrderCreateSchema>;

export const PosOpenTicketCreateSchema = z.object({
  idempotencyKey: z.string().uuid(),
  terminalId: z.string().uuid("Terminal is required"),
  customerId: nullableUuidInput,
  ticketName: nullableTextInput,
  fulfillmentType: z.enum(["WALK_IN", "DINE_IN", "TAKE_OUT", "DELIVERY", "PICKUP"]),
  tableNumber: nullableTextInput,
  guestCount: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    return value;
  }, z.coerce.number().int().min(1).max(999).nullable()),
  kitchenStation: nullableTextInput,
  notes: nullableTextInput,
});

export type PosOpenTicketCreateInput = z.infer<typeof PosOpenTicketCreateSchema>;

export const PrescriptionVerificationCreateSchema = z.object({
  idempotencyKey: z.string().uuid(),
  terminalId: nullableUuidInput,
  customerId: nullableUuidInput,
  productId: z.string().uuid("Product is required"),
  prescriptionReference: nullableTextInput,
  status: z.enum(["PENDING", "VERIFIED", "REJECTED"]).default("PENDING"),
  notes: nullableTextInput,
});

export type PrescriptionVerificationCreateInput = z.infer<typeof PrescriptionVerificationCreateSchema>;

export interface BusinessFitOptionDTO {
  id: string;
  label: string;
  helper?: string | null;
}

export interface BusinessFitMatrixRowDTO {
  preset: (typeof businessTypePresets)[number];
  label: string;
  status: "ready_now" | "supported_with_setup" | "advanced_setup";
  present: string[];
  partial: string[];
  missing: string[];
  helpAnchors: string[];
}

export interface BusinessFitQueueItemDTO {
  id: string;
  number: string;
  title: string;
  status: string;
  customer: string;
  amount?: number | null;
  schedule?: Date | null;
  helper: string;
}

export interface BusinessFitWorkspaceDTO {
  company: {
    id: string | null;
    name: string;
    businessTypePreset: (typeof businessTypePresets)[number] | null;
  };
  summary: {
    serviceBookings: number;
    repairJobs: number;
    salesOrders: number;
    openTickets: number;
    prescriptionChecks: number;
    variants: number;
    serials: number;
    bundles: number;
  };
  matrix: BusinessFitMatrixRowDTO[];
  serviceBookings: BusinessFitQueueItemDTO[];
  repairJobs: BusinessFitQueueItemDTO[];
  salesOrders: BusinessFitQueueItemDTO[];
  openTickets: BusinessFitQueueItemDTO[];
  prescriptionChecks: BusinessFitQueueItemDTO[];
  options: {
    customers: BusinessFitOptionDTO[];
    products: BusinessFitOptionDTO[];
    serviceProducts: BusinessFitOptionDTO[];
    staff: BusinessFitOptionDTO[];
    terminals: BusinessFitOptionDTO[];
  };
}
