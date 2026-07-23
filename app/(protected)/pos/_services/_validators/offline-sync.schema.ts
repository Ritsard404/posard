import { z } from "zod";

const invoiceStatusSchema = z.enum(["CANCELLED", "RETURNED", "VOID", "PENDING", "PAID"]);
const discountTypeSchema = z.enum(["PWD", "SENIOR", "DSWD", "OTHERS"]);
const settlementModeSchema = z.enum(["pay_now", "debt"]);
const syncStatusSchema = z.enum(["pending", "syncing", "synced", "failed", "needs_review"]);
const fulfillmentTypeSchema = z.enum([
  "WALK_IN",
  "DINE_IN",
  "TAKE_OUT",
  "DELIVERY",
  "PICKUP",
]);
const modifierGroupTypeSchema = z.enum([
  "VARIANT",
  "MODIFIER",
  "ADDON",
  "INSTRUCTION",
]);

const orderSchema = z.object({
  timestampId: z.string().min(1),
  deviceId: z.string().optional(),
  idempotencyKey: z.string().min(1).optional(),
  invoiceNumber: z.number().int().positive().nullable().optional(),
  localInvoiceNo: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().positive(),
        price: z.number().nonnegative(),
        basePrice: z.number().nonnegative().optional(),
        subTotal: z.number().nonnegative(),
        status: invoiceStatusSchema.optional(),
        selections: z
          .array(
            z.object({
              modifierGroupName: z.string().min(1),
              modifierGroupType: modifierGroupTypeSchema,
              optionName: z.string().optional(),
              priceDelta: z.number(),
              quantity: z.number().int().positive(),
              sortOrder: z.number().int(),
            }),
          )
          .optional(),
        specialInstructions: z.string().optional(),
        prescriptionRequired: z.boolean().optional(),
        prescriptionConfirmed: z.boolean().optional(),
        prescriptionReference: z.string().optional(),
      }),
    )
    .min(1),
  cashTenderAmount: z.number().nonnegative(),
  ePayments: z
    .array(
      z.object({
        saleTypeId: z.string().min(1),
        reference: z.string().min(1),
        amount: z.number().positive(),
      }),
    )
    .optional(),
  discount: z
    .object({
      discountType: discountTypeSchema.optional(),
      eligibleDiscName: z.string().optional(),
      oscaIdNum: z.string().optional(),
      discountAmount: z.number().nonnegative().optional(),
      discountPercent: z.number().nonnegative().optional(),
      managerPin: z.string().optional(),
    })
    .optional(),
  fulfillmentType: fulfillmentTypeSchema.optional(),
  tableNumber: z.string().optional(),
  guestCount: z.number().int().positive().optional(),
  deliveryCustomerName: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryReference: z.string().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  settlementMode: settlementModeSchema.optional(),
  debt: z
    .object({
      customerId: z.string().min(1),
      dueDate: z.string().min(1),
      notes: z.string().optional(),
      upfrontCashAmount: z.number().nonnegative().optional(),
      managerPin: z.string().optional(),
    })
    .optional(),
});

const receiptSchema = z.object({
  id: z.string(),
  invoiceNumber: z.number().nullable(),
  localInvoiceNo: z.string().nullable().optional(),
  isProvisional: z.boolean().optional(),
  syncStatus: z.string().optional(),
  syncError: z.string().nullable().optional(),
  createdAt: z.string(),
}).passthrough();

const queuedActionBaseSchema = z.object({
  localId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  timestampId: z.string().min(1),
  terminalId: z.string().min(1),
  deviceId: z.string().min(1),
  cashierId: z.string().min(1),
  companyId: z.string().min(1),
  createdAtLocal: z.string().min(1),
  syncStatus: syncStatusSchema,
  retryCount: z.number().int().nonnegative().optional(),
  nextRetryAt: z.string().nullable().optional(),
  lastError: z.string().nullable(),
  syncedAt: z.string().nullable(),
});

export const queuedPosActionSchema = z.discriminatedUnion("type", [
  queuedActionBaseSchema.extend({
    type: z.literal("PAY_ORDER"),
    payload: z.object({
      order: orderSchema,
      invoiceNoLocal: z.string().min(1),
      invoiceNumber: z.number().int().positive().nullable().optional(),
      stockSnapshotVersion: z.string().min(1),
      receipt: receiptSchema,
    }),
  }),
  queuedActionBaseSchema.extend({
    type: z.literal("VOID_ORDER"),
    payload: z.object({
      order: orderSchema,
      managerProfileId: z.string().min(1),
      managerEmail: z.string().email(),
      managerName: z.string().min(1),
      reason: z.string().min(1),
    }),
  }),
  queuedActionBaseSchema.extend({
    type: z.literal("WITHDRAW_CASH"),
    payload: z.object({
      amount: z.number().positive(),
      reason: z.string().trim().min(1).max(200),
      managerProfileId: z.string().min(1).optional(),
      managerEmail: z.string().email().optional(),
      managerName: z.string().min(1).optional(),
    }),
  }),
  queuedActionBaseSchema.extend({
    type: z.literal("CLOSE_SESSION"),
    payload: z.object({
      sessionId: z.string().min(1),
      countedCash: z.number().nonnegative(),
      managerProfileId: z.string().min(1).optional(),
      managerEmail: z.string().email().optional(),
      managerName: z.string().min(1).optional(),
    }),
  }),
]);

export const syncActionsRequestSchema = z.object({
  actions: z.array(queuedPosActionSchema).default([]),
});
