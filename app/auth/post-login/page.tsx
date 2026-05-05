import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { resolveLoginDestination } from "@/lib/auth/login-destination";

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
  const result = await resolveLoginDestination();

  if (!result.ok) {
    logTiming({
      reason: result.reason,
      ms: Math.round(performance.now() - startedAt),
    });
    redirect("/auth/login");
  }

  logTiming({
    reason: result.destination,
    ms: Math.round(performance.now() - startedAt),
  });
  redirect(result.destination);
}
