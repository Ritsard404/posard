import "server-only";

import { NextResponse } from "next/server";
import type { RateLimitResult } from "./rate-limit";

export type SecurityFailureCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "INVALID_PAYLOAD"
  | "STALE_VERIFICATION_REQUIRED"
  | "RESOURCE_SCOPE_MISMATCH";

export function securityFailure(code: SecurityFailureCode, message: string, extra?: {
  retryAfterSec?: number;
}) {
  return {
    ok: false,
    code,
    message,
    ...(extra?.retryAfterSec ? { retryAfterSec: extra.retryAfterSec } : {}),
  };
}

export function rateLimitedMessage(result: RateLimitResult) {
  return `Too many requests. Please try again in ${result.retryAfterSec} seconds.`;
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    securityFailure("RATE_LIMITED", "Too many requests. Please try again later.", {
      retryAfterSec: result.retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetAt),
      },
    },
  );
}

export function invalidPayloadResponse(message = "Invalid request payload.") {
  return NextResponse.json(securityFailure("INVALID_PAYLOAD", message), { status: 400 });
}
