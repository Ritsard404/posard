import "server-only";

import { prisma } from "@/lib/prisma";

export const COMPANY_BILLING_RESTRICTION_MESSAGE =
  "POS access is suspended because this company has no active terminal subscription. Renew or reactivate a subscription to continue.";

export const MANAGER_BILLING_RESTRICTION_MESSAGE =
  "Cashier management is suspended because this company has no active terminal subscription.";

export const TERMINAL_BILLING_RESTRICTION_MESSAGE =
  "This POS terminal cannot be used because its subscription is not active.";

export const TERMINAL_BILLING_TRANSACTION_RESTRICTION_MESSAGE =
  "This POS terminal can stay open for cash tracking, but no new transactions can be created because its subscription is not active.";

type TerminalBillingSnapshot = {
  terminalId: string;
  posName: string | null;
  isDefaultTerminal: boolean;
  subscription: {
    status: "pending" | "active" | "expired" | "suspended" | "cancelled";
    expiresAt: Date | null;
  } | null;
};

export type CompanyBillingAccess = {
  isRestricted: boolean;
  reason: string | null;
  activeTerminalIds: Set<string>;
  terminals: TerminalBillingSnapshot[];
};

function hasDatePassed(value: Date | null | undefined) {
  return !value || value.getTime() < Date.now();
}

function isTerminalSubscriptionActive(subscription: TerminalBillingSnapshot["subscription"]) {
  return subscription?.status === "active" && !hasDatePassed(subscription.expiresAt);
}

export function isTerminalPosAccessible(
  terminal: Pick<TerminalBillingSnapshot, "isDefaultTerminal" | "subscription">,
) {
  return terminal.isDefaultTerminal
    ? !terminal.subscription || isTerminalSubscriptionActive(terminal.subscription)
    : isTerminalSubscriptionActive(terminal.subscription);
}

export async function getCompanyBillingAccess(
  companyId: string,
): Promise<CompanyBillingAccess> {
  const terminals = await prisma.posTerminalInfo.findMany({
    where: { companyId },
    select: {
      id: true,
      posName: true,
      isDefaultTerminal: true,
      subscription: {
        select: {
          status: true,
          expiresAt: true,
        },
      },
    },
    orderBy: { posName: "asc" },
  });

  const activeTerminalIds = new Set(
    terminals
      .filter((terminal) => isTerminalPosAccessible(terminal))
      .map((terminal) => terminal.id),
  );

  return {
    isRestricted: activeTerminalIds.size === 0,
    reason:
      activeTerminalIds.size === 0 ? COMPANY_BILLING_RESTRICTION_MESSAGE : null,
    activeTerminalIds,
    terminals: terminals.map((terminal) => ({
      terminalId: terminal.id,
      posName: terminal.posName,
      isDefaultTerminal: terminal.isDefaultTerminal,
      subscription: terminal.subscription,
    })),
  };
}

export async function assertCompanyBillingAllowsPos(companyId: string) {
  const access = await getCompanyBillingAccess(companyId);

  if (access.isRestricted) {
    throw new Error(COMPANY_BILLING_RESTRICTION_MESSAGE);
  }

  return access;
}

export async function assertTerminalBillingAllowsPos(
  companyId: string,
  terminalId: string,
) {
  const terminal = await prisma.posTerminalInfo.findFirst({
    where: {
      id: terminalId,
      companyId,
    },
    select: {
      isDefaultTerminal: true,
      subscription: {
        select: {
          status: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!terminal) {
    throw new Error("Terminal not found.");
  }

  if (!isTerminalPosAccessible(terminal)) {
    throw new Error(TERMINAL_BILLING_RESTRICTION_MESSAGE);
  }

  return terminal;
}

export async function assertTerminalBillingAllowsTransactions(
  companyId: string,
  terminalId: string,
) {
  const terminal = await prisma.posTerminalInfo.findFirst({
    where: {
      id: terminalId,
      companyId,
    },
    select: {
      isDefaultTerminal: true,
      subscription: {
        select: {
          status: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!terminal) {
    throw new Error("Terminal not found.");
  }

  if (!isTerminalPosAccessible(terminal)) {
    throw new Error(TERMINAL_BILLING_TRANSACTION_RESTRICTION_MESSAGE);
  }

  return terminal;
}

export async function assertManagerBillingAllowsCashierManagement(input: {
  companyId: string | null;
  role: string;
}) {
  if (input.role !== "manager") {
    return;
  }

  if (!input.companyId) {
    throw new Error("A company is required");
  }

  const access = await getCompanyBillingAccess(input.companyId);

  if (access.isRestricted) {
    throw new Error(MANAGER_BILLING_RESTRICTION_MESSAGE);
  }
}
