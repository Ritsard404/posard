import "server-only";

import { checkRateLimit } from "./rate-limit";
import { securityConfig, type SecurityRateLimitBucket } from "./security-config";
import { auditSecurityEvent } from "./audit-security";
import { getRequestIdentity } from "./request-identity";
import { rateLimitedMessage } from "./response";

export async function enforceRateLimit(input: {
  bucket: SecurityRateLimitBucket;
  route: string;
  userId?: string | null;
  profileId?: string | null;
  role?: string | null;
  companyId?: string | null;
  terminalId?: string | null;
  action?: string;
}) {
  const tier = securityConfig.rateLimits[input.bucket];
  const identity = await getRequestIdentity(input);
  const result = await checkRateLimit({
    bucket: input.bucket,
    key: identity.key,
    windowMs: tier.windowMs,
    max: tier.max,
  });

  if (!result.allowed) {
    await auditSecurityEvent({
      action: input.action ?? input.bucket,
      route: input.route,
      result: "blocked",
      reasonCode: "RATE_LIMITED",
      userId: input.userId ?? null,
      actorProfileId: input.profileId ?? null,
      role: input.role ?? null,
      companyId: input.companyId ?? null,
      terminalId: input.terminalId ?? null,
      ipHash: identity.ipHash,
      correlationId: identity.correlationId,
    });
    throw new Error(rateLimitedMessage(result));
  }

  return result;
}
