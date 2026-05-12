"use server";

import { enforceRateLimit } from "@/lib/security/rate-limit-guard";

type AuthSecurityResult =
  | { success: true }
  | { success: false; error: string; retryAfterSec?: number };

function retryAfterFromMessage(message: string) {
  const match = message.match(/(\d+) seconds/);
  return match ? Number(match[1]) : undefined;
}

export async function checkLoginRateLimitAction(): Promise<AuthSecurityResult> {
  try {
    await enforceRateLimit({ bucket: "login", route: "/auth/login", action: "LOGIN_ATTEMPT" });
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Too many requests. Please try again later.";
    return { success: false, error: message, retryAfterSec: retryAfterFromMessage(message) };
  }
}

export async function checkPasswordResetRateLimitAction(): Promise<AuthSecurityResult> {
  try {
    await enforceRateLimit({
      bucket: "passwordReset",
      route: "/auth/forgot-password",
      action: "PASSWORD_RESET_ATTEMPT",
    });
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Too many requests. Please try again later.";
    return { success: false, error: message, retryAfterSec: retryAfterFromMessage(message) };
  }
}
