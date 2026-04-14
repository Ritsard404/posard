import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreateAuditLogInputDto } from "./audit-log.dto";

type AuditLogClient = PrismaClient | Prisma.TransactionClient;

function assertAuditLogInput(input: CreateAuditLogInputDto) {
  if (!input.companyId) {
    throw new Error("Audit log companyId is required.");
  }

  if (!input.actorProfileId) {
    throw new Error("Audit log actorProfileId is required.");
  }

  if (!input.actionType?.trim()) {
    throw new Error("Audit log actionType is required.");
  }

}

export const auditLogService = {
  async create(
    client: AuditLogClient,
    input: CreateAuditLogInputDto,
  ): Promise<void> {
    assertAuditLogInput(input);

    await client.auditLog.create({
      data: {
        companyId: input.companyId,
        actorProfileId: input.actorProfileId,
        posTerminalId: input.posTerminalId ?? null,
        actionType: input.actionType.trim(),
        referenceId: input.referenceId ?? null,
        changes: input.changes?.trim() || null,
        amount: input.amount ?? null,
      },
    });
  },
};
