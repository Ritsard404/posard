import "server-only";

import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/lib/services/audit-log.service";
import { logAbuseEvent, type AbuseLogInput } from "./abuse-log";

export async function auditSecurityEvent(input: AbuseLogInput & {
  actorProfileId?: string | null;
  referenceId?: string | null;
}) {
  await logAbuseEvent(input);

  if (!input.companyId || !input.actorProfileId) {
    return;
  }

  await auditLogService.create(prisma, {
    companyId: input.companyId,
    actorProfileId: input.actorProfileId,
    posTerminalId: input.terminalId ?? null,
    actionType: `SECURITY_${input.action}`.slice(0, 80),
    referenceId: input.referenceId ?? null,
    changes: JSON.stringify({
      result: input.result,
      reasonCode: input.reasonCode,
      route: input.route,
      correlationId: input.correlationId,
      ipHash: input.ipHash,
    }),
  });
}
