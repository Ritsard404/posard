"use client";

import { clearProtectedBrowserCaches } from "@/lib/security/protected-cache.client";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_SIGN_OUT_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Sign out timed out."));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

export async function clearClientSessionForLogout(
  timeoutMs = DEFAULT_SIGN_OUT_TIMEOUT_MS,
) {
  const supabase = createClient();

  try {
    await withTimeout(supabase.auth.signOut(), timeoutMs);
  } catch (error) {
    console.warn("Unable to finish remote sign out before local logout cleanup.", error);
  }

  await clearProtectedBrowserCaches();
}
