import { z } from "zod";

export const subscriptionBillingCycleValues = ["monthly", "quarterly", "annually"] as const;
export const subscriptionStatusValues = [
  "pending",
  "active",
  "expired",
  "suspended",
  "cancelled",
] as const;

const nullableDateInput = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value instanceof Date ? value : new Date(value);
  });

const nullableNumberInput = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return value;
}, z.coerce.number().min(0).nullable());

const nullableStringInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

export const TerminalSubscriptionSchema = z.object({
  id: z.string().uuid(),
  terminalId: z.string().uuid(),
  billingCycle: z.enum(subscriptionBillingCycleValues),
  status: z.enum(subscriptionStatusValues),
  startsAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  renewedAt: z.date().nullable(),
  autoRenew: z.boolean(),
  price: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  terminal: z.object({
    id: z.string().uuid(),
    posName: z.string(),
    registeredName: z.string(),
    isActive: z.boolean(),
    isTrainMode: z.boolean(),
  }),
});

export type TerminalSubscriptionDTO = z.infer<typeof TerminalSubscriptionSchema>;

export const UpsertTerminalSubscriptionSchema = z.object({
  billingCycle: z.enum(subscriptionBillingCycleValues),
  status: z.enum(subscriptionStatusValues),
  startsAt: nullableDateInput,
  expiresAt: nullableDateInput,
  renewedAt: nullableDateInput.optional(),
  autoRenew: z.boolean(),
  price: nullableNumberInput.optional(),
  notes: nullableStringInput.optional(),
});

export type UpsertTerminalSubscriptionPayload = z.input<typeof UpsertTerminalSubscriptionSchema>;
export type UpsertTerminalSubscriptionInput = z.infer<typeof UpsertTerminalSubscriptionSchema>;
