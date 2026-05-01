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
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    redirect("/auth/login");
  }

  const activePosSession = await prisma.timestamp.findFirst({
    where: {
      cashierId: profile.id,
      timestampOut: null,
    },
    select: { id: true },
  });

  redirect(activePosSession ? "/pos" : "/dashboard");
}
