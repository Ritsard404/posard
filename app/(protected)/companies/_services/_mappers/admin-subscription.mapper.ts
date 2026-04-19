import type { AdminSubscriptionListItemDto } from "../_dto/admin-subscription.dto";

export function mapAdminSubscriptionListItem(terminal: {
  id: string;
  posName: string | null;
  companyId: string;
  isActive: boolean;
  company: { name: string };
  subscription: {
    billingCycle: "monthly" | "quarterly" | "annually";
    status: "pending" | "active" | "expired" | "suspended" | "cancelled";
    startsAt: Date | null;
    expiresAt: Date | null;
    renewedAt: Date | null;
    price: { toNumber(): number } | null;
    autoRenew: boolean;
    notes: string | null;
  } | null;
}): AdminSubscriptionListItemDto {
  return {
    terminalId: terminal.id,
    terminalName: terminal.posName ?? "Unnamed terminal",
    companyId: terminal.companyId,
    companyName: terminal.company.name,
    billingCycle: terminal.subscription?.billingCycle ?? null,
    status: terminal.subscription?.status ?? null,
    startsAt: terminal.subscription?.startsAt ?? null,
    expiresAt: terminal.subscription?.expiresAt ?? null,
    renewedAt: terminal.subscription?.renewedAt ?? null,
    price: terminal.subscription?.price?.toNumber() ?? null,
    autoRenew: terminal.subscription?.autoRenew ?? false,
    notes: terminal.subscription?.notes ?? null,
    isTerminalActive: terminal.isActive,
  };
}
