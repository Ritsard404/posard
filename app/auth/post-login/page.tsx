import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PostLoginPage() {
  const startedAt = performance.now();
  const logTiming = (data: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("POSard post-login timing", data);
    }
  };
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    logTiming({
      reason: "inactive-or-missing-profile",
      ms: Math.round(performance.now() - startedAt),
    });
    redirect("/auth/login");
  }

  if (profile.role === "manager" && !profile.companyId) {
    logTiming({
      reason: "manager-company-setup-required",
      ms: Math.round(performance.now() - startedAt),
    });
    redirect("/setup-company");
  }

  const activePosSession = await prisma.timestamp.findFirst({
    where: {
      cashierId: profile.id,
      timestampOut: null,
    },
    select: { id: true },
  });

  logTiming({
    reason: activePosSession ? "active-pos-session" : "default-dashboard",
    ms: Math.round(performance.now() - startedAt),
  });
  redirect(activePosSession ? "/pos" : "/dashboard");
}
