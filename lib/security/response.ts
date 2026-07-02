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

export function rateLimitErrorResponse(message = "Too many requests. Please try again later.") {
  return NextResponse.json(securityFailure("RATE_LIMITED", message), { status: 429 });
}

export const sensitiveNoStoreHeaders = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
} as const;

export function sensitiveDownloadHeaders(input: {
  contentType: string;
  filename: string;
}) {
  return {
    ...sensitiveNoStoreHeaders,
    "Content-Type": input.contentType,
    "Content-Disposition": `attachment; filename="${input.filename}"`,
  };
}

export function unauthorizedResponse(message = "Unauthorized.") {
  return NextResponse.json(securityFailure("UNAUTHORIZED", message), { status: 401 });
}

export function forbiddenResponse(message = "Forbidden.") {
  return NextResponse.json(securityFailure("FORBIDDEN", message), { status: 403 });
}

export function invalidPayloadResponse(message = "Invalid request payload.") {
  return NextResponse.json(securityFailure("INVALID_PAYLOAD", message), { status: 400 });
}
