import type { AdminCompanyListItemDto } from "../_dto/admin-company.dto";

export function mapAdminCompanyListItem(company: {
  id: string;
  name: string;
  email: string | null;
  code: string | null;
  phone: string | null;
  logoImageUrl: string | null;
  createdAt: Date;
  users: Array<{ fullName: string | null; email: string }>;
  posTerminals: Array<{ isActive: boolean; subscription: { status: "pending" | "active" | "expired" | "suspended" | "cancelled" } | null }>;
  terminalRequests: Array<{ id: string }>;
}): AdminCompanyListItemDto {
  const owner = company.users[0];
  const activeTerminalCount = company.posTerminals.filter((terminal) => terminal.isActive).length;
  const activeSubscriptionCount = company.posTerminals.filter(
    (terminal) => terminal.subscription?.status === "active",
  ).length;

  return {
    id: company.id,
    name: company.name,
    email: company.email,
    code: company.code,
    phone: company.phone,
    logoImageUrl: company.logoImageUrl,
    ownerManagerName: owner?.fullName ?? null,
    ownerManagerEmail: owner?.email ?? null,
    createdAt: company.createdAt,
    terminalCount: company.posTerminals.length,
    activeTerminalCount,
    activeSubscriptionCount,
    pendingTerminalRequestCount: company.terminalRequests.length,
  };
}
