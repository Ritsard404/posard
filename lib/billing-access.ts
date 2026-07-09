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
  validUntil: Date;
  subscription: {
    status: "pending" | "active" | "expired" | "suspended" | "cancelled";
    expiresAt: Date | null;
  } | null;
};

export type PlatformBillingMode = "FREE" | "PAID";

export type CompanyBillingAccess = {
  isRestricted: boolean;
  reason: string | null;
  activeTerminalIds: Set<string>;
  terminals: TerminalBillingSnapshot[];
  platformBillingMode: PlatformBillingMode;
};

function getDateOnlyValue(value: Date) {
  return value.getFullYear() * 10_000 + (value.getMonth() + 1) * 100 + value.getDate();
}

export function hasCoverageDatePassed(value: Date | null | undefined, missingIsExpired = true) {
  if (!value) {
    return missingIsExpired;
  }

  return getDateOnlyValue(value) < getDateOnlyValue(new Date());
}

function isTerminalSubscriptionActive(subscription: TerminalBillingSnapshot["subscription"]) {
  return (
    subscription?.status === "active" &&
    !hasCoverageDatePassed(subscription.expiresAt, false)
  );
}

export async function getPlatformBillingMode(): Promise<PlatformBillingMode> {
  const config = await prisma.systemConfiguration.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
    select: { platformBillingMode: true },
  });

  return config.platformBillingMode;
}

export function isPlatformBillingFree(mode: PlatformBillingMode) {
  return mode === "FREE";
}

export function isTerminalPosAccessible(
  terminal: Pick<TerminalBillingSnapshot, "isDefaultTerminal" | "validUntil" | "subscription">,
) {
  if (terminal.isDefaultTerminal) {
    return true;
  }

  return (
    isTerminalSubscriptionActive(terminal.subscription) &&
    !hasCoverageDatePassed(terminal.validUntil)
  );
}

export async function isTerminalPosAccessibleForCurrentMode(
  terminal: Pick<TerminalBillingSnapshot, "isDefaultTerminal" | "validUntil" | "subscription">,
) {
  const mode = await getPlatformBillingMode();
  return isPlatformBillingFree(mode) || isTerminalPosAccessible(terminal);
}

export async function getCompanyBillingAccess(
  companyId: string,
): Promise<CompanyBillingAccess> {
  const platformBillingMode = await getPlatformBillingMode();
  const terminals = await prisma.posTerminalInfo.findMany({
    where: { companyId },
    select: {
      id: true,
      posName: true,
      isDefaultTerminal: true,
      validUntil: true,
      subscription: {
        select: {
          status: true,
          expiresAt: true,
        },
      },
    },
    orderBy: { posName: "asc" },
  });

  const activeTerminalIds = new Set<string>();
  for (const terminal of terminals) {
    if (isPlatformBillingFree(platformBillingMode) || isTerminalPosAccessible(terminal)) {
      activeTerminalIds.add(terminal.id);
    }
  }

  return {
    isRestricted: !isPlatformBillingFree(platformBillingMode) && activeTerminalIds.size === 0,
    reason:
      !isPlatformBillingFree(platformBillingMode) && activeTerminalIds.size === 0
        ? COMPANY_BILLING_RESTRICTION_MESSAGE
        : null,
    activeTerminalIds,
    platformBillingMode,
    terminals: terminals.map((terminal) => ({
      terminalId: terminal.id,
      posName: terminal.posName,
      isDefaultTerminal: terminal.isDefaultTerminal,
      validUntil: terminal.validUntil,
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
  const platformBillingMode = await getPlatformBillingMode();
  if (isPlatformBillingFree(platformBillingMode)) {
    return null;
  }

  const terminal = await prisma.posTerminalInfo.findFirst({
    where: {
      id: terminalId,
      companyId,
    },
    select: {
      isDefaultTerminal: true,
      validUntil: true,
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
  const platformBillingMode = await getPlatformBillingMode();
  if (isPlatformBillingFree(platformBillingMode)) {
    return null;
  }

  const terminal = await prisma.posTerminalInfo.findFirst({
    where: {
      id: terminalId,
      companyId,
    },
    select: {
      isDefaultTerminal: true,
      validUntil: true,
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
