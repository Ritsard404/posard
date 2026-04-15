import { z } from "zod";
import { subscriptionBillingCycleValues, subscriptionStatusValues } from "../../[companyId]/_services/subscription.dto";
import { PaginationQuerySchema } from "./common.dto";

export const AdminSubscriptionListQuerySchema = PaginationQuerySchema.extend({
  companyId: z.string().uuid().optional(),
  status: z.enum(subscriptionStatusValues).optional(),
  billingCycle: z.enum(subscriptionBillingCycleValues).optional(),
});

export type AdminSubscriptionListQueryInput = z.input<typeof AdminSubscriptionListQuerySchema>;
export type AdminSubscriptionListQuery = z.infer<typeof AdminSubscriptionListQuerySchema>;

export interface AdminSubscriptionListItemDto {
  terminalId: string;
  terminalName: string;
  companyId: string;
  companyName: string;
  billingCycle: "monthly" | "quarterly" | "annually" | null;
  status: "pending" | "active" | "expired" | "suspended" | "cancelled" | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  renewedAt: Date | null;
  price: number | null;
  autoRenew: boolean;
  notes: string | null;
  isTerminalActive: boolean;
}
