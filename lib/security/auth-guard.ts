import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentAuthUser, getCurrentProfile } from "@/lib/auth/current-user";
import { assertRole } from "./permissions";
import type { UserRole } from "@/lib/access-control-core";

export async function requireAuthenticatedUser() {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireCurrentProfile() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Unauthorized");
  return profile;
}

export async function requireRole(allowed: UserRole[]) {
  const profile = await requireCurrentProfile();
  assertRole(profile.role, allowed);
  return profile;
}

export async function requireCompanyAccess(companyId: string) {
  const profile = await requireCurrentProfile();
  if (profile.role !== "admin" && profile.companyId !== companyId) {
    throw new Error("Forbidden");
  }
  return profile;
}

export async function requireTerminalAccess(terminalId: string) {
  const profile = await requireCurrentProfile();
  const terminal = await prisma.posTerminalInfo.findFirst({
    where: {
      id: terminalId,
      ...(profile.role === "admin" ? {} : { companyId: profile.companyId ?? "" }),
    },
    select: { id: true, companyId: true },
  });

  if (!terminal) throw new Error("Forbidden");
  return { profile, terminal };
}

export async function requireInvoiceAccess(invoiceId: string) {
  const profile = await requireCurrentProfile();
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      ...(profile.role === "admin"
        ? {}
        : { posTerminal: { companyId: profile.companyId ?? "" } }),
    },
    select: { id: true, posTerminalId: true, posTerminal: { select: { companyId: true } } },
  });

  if (!invoice) throw new Error("Forbidden");
  return { profile, invoice };
}
