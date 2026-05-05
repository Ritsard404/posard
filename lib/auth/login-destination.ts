import "server-only";

import { prisma } from "@/lib/prisma";

import { getCurrentProfile } from "./current-user";

export type LoginDestinationResult =
  | { ok: true; destination: "/setup-company" | "/pos" | "/dashboard" }
  | { ok: false; reason: "missing-or-inactive-profile" };

export async function resolveLoginDestination(): Promise<LoginDestinationResult> {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    return { ok: false, reason: "missing-or-inactive-profile" };
  }

  if (profile.role === "manager" && !profile.companyId) {
    return { ok: true, destination: "/setup-company" };
  }

  const activePosSession = await prisma.timestamp.findFirst({
    where: {
      cashierId: profile.id,
      timestampOut: null,
    },
    select: { id: true },
  });

  return { ok: true, destination: activePosSession ? "/pos" : "/dashboard" };
}
