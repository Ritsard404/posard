import { z } from "zod";

const uuid = z.string().uuid();
const positiveNumber = z.coerce.number().positive();
const optionalText = z.string().trim().optional().transform((value) => value || null);

export const stockAdjustmentSchema = z.object({
  productId: uuid,
  terminalId: uuid.optional().or(z.literal("")).transform((value) => value || null),
  direction: z.enum(["increase", "decrease"]),
  quantity: positiveNumber,
  reason: z.string().trim().min(2).max(120),
  notes: optionalText,
});

export const expenseCreateSchema = z.object({
  categoryId: uuid,
  terminalId: uuid.optional().or(z.literal("")).transform((value) => value || null),
  expenseDate: z.coerce.date(),
  amount: positiveNumber,
  notes: optionalText,
});

export const expenseTransitionSchema = z.object({
  expenseId: uuid,
  action: z.enum(["submit", "approve", "reject", "cancel", "post"]),
  reason: optionalText,
});

export const supplierUpsertSchema = z.object({
  supplierId: uuid.optional().or(z.literal("")).transform((value) => value || null),
  name: z.string().trim().min(2).max(160),
  contactName: optionalText,
  phone: optionalText,
  email: z.string().trim().email().optional().or(z.literal("")).transform((value) => value || null),
  address: optionalText,
  notes: optionalText,
});

export const supplierArchiveSchema = z.object({
  supplierId: uuid,
});

export const purchaseOrderCreateSchema = z.object({
  supplierId: uuid,
  expectedAt: z.coerce.date().optional().or(z.literal("")).transform((value) => value || null),
  notes: optionalText,
  productId: uuid,
  quantity: positiveNumber,
  unitCost: z.coerce.number().min(0),
});

export const purchaseOrderTransitionSchema = z.object({
  purchaseOrderId: uuid,
  action: z.enum(["submit", "approve", "mark_ordered", "cancel", "close"]),
});

export const purchaseOrderReceiveSchema = z.object({
  purchaseOrderId: uuid,
  purchaseOrderItemId: uuid,
  quantityReceived: positiveNumber,
  notes: optionalText,
});

export const transferCreateSchema = z.object({
  sourceTerminalId: uuid,
  destinationTerminalId: uuid,
  notes: optionalText,
  productId: uuid,
  requestedQuantity: positiveNumber,
}).refine((value) => value.sourceTerminalId !== value.destinationTerminalId, {
  message: "Source and destination must be different.",
  path: ["destinationTerminalId"],
});

export const transferTransitionSchema = z.object({
  transferId: uuid,
  action: z.enum(["submit", "approve", "dispatch", "receive", "cancel"]),
  receivedQuantity: z.coerce.number().min(0).optional(),
  notes: optionalText,
});

export const promotionCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  promotionType: z.enum(["fixed_amount", "percentage", "item_level", "order_level", "buy_x_get_y", "bundle_price", "quantity_threshold"]),
  value: z.coerce.number().min(0),
  startsAt: z.coerce.date().optional().or(z.literal("")).transform((value) => value || null),
  endsAt: z.coerce.date().optional().or(z.literal("")).transform((value) => value || null),
  stackable: z.coerce.boolean().optional().default(false),
  exclusive: z.coerce.boolean().optional().default(false),
  notes: optionalText,
});

export const promotionTransitionSchema = z.object({
  promotionId: uuid,
  action: z.enum(["activate", "pause", "archive", "duplicate"]),
});

export const kitchenTicketTransitionSchema = z.object({
  ticketId: uuid,
  action: z.enum(["start", "ready", "served", "cancel"]),
  notes: optionalText,
});

export const syncIssueTransitionSchema = z.object({
  issueId: uuid,
  action: z.enum(["retry", "review", "resolve", "dismiss"]),
  notes: optionalText,
});
