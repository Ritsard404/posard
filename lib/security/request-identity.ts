import { createHash, randomUUID } from "crypto";
import { headers } from "next/headers";
import { getClientIp } from "./ip";

function hashPart(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function getCorrelationIdFromHeaders(headerStore: Headers) {
  return (
    headerStore.get("x-posard-correlation-id") ||
    headerStore.get("x-request-id") ||
    randomUUID()
  );
}

export async function getRequestIdentity(input: {
  route: string;
  userId?: string | null;
  companyId?: string | null;
  terminalId?: string | null;
}) {
  const headerStore = await headers();
  const ip = getClientIp(headerStore);
  const correlationId = getCorrelationIdFromHeaders(headerStore);
  const parts = [
    input.userId ? `user:${input.userId}` : `ip:${hashPart(ip)}`,
    input.companyId ? `company:${input.companyId}` : null,
    input.terminalId ? `terminal:${input.terminalId}` : null,
    `route:${input.route}`,
  ].filter(Boolean);

  return {
    key: parts.join("|"),
    ipHash: hashPart(ip),
    correlationId,
  };
}

export function buildScopedRateLimitKey(input: {
  route: string;
  userId?: string | null;
  companyId?: string | null;
  terminalId?: string | null;
  fallbackIpHash?: string | null;
}) {
  return [
    input.userId ? `user:${input.userId}` : `ip:${input.fallbackIpHash ?? "unknown"}`,
    input.companyId ? `company:${input.companyId}` : null,
    input.terminalId ? `terminal:${input.terminalId}` : null,
    `route:${input.route}`,
  ]
    .filter(Boolean)
    .join("|");
}
