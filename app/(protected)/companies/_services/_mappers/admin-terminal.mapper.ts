import type { AdminTerminalListItemDto } from "../_dto/admin-terminal.dto";

export function mapAdminTerminalListItem(terminal: {
  id: string;
  companyId: string;
  posName: string;
  registeredName: string;
  createdAt: Date;
  isActive: boolean;
  company: { name: string };
  subscription: { status: "pending" | "active" | "expired" | "suspended" | "cancelled"; expiresAt: Date | null } | null;
  sessions: Array<{ profile: { fullName: string | null; email: string } }>;
}): AdminTerminalListItemDto {
  const activeSession = terminal.sessions[0];
  const isInUse = Boolean(activeSession);

  return {
    id: terminal.id,
    companyId: terminal.companyId,
    companyName: terminal.company.name,
    posName: terminal.posName,
    registeredName: terminal.registeredName,
    approvalStatus: isInUse ? "in_use" : terminal.isActive ? "active" : "inactive",
    assignedUserName: activeSession?.profile.fullName ?? activeSession?.profile.email ?? null,
    createdAt: terminal.createdAt,
    isActive: terminal.isActive,
    isInUse,
    subscriptionStatus: terminal.subscription?.status ?? null,
    subscriptionExpiresAt: terminal.subscription?.expiresAt ?? null,
  };
}

