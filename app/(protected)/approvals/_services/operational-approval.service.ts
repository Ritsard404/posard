import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/lib/services/audit-log.service";
import { notificationEventsService } from "@/app/(protected)/notifications/_services/notification-events.service";
import type { AccountsViewerDto } from "@/app/(protected)/accounts/_services/_dto/accounts.dto";
import { mapOperationalApprovalToListItem } from "./_mappers/operational-approval.mapper";
import type {
  DecideOperationalApprovalInputDto,
  OperationalApprovalListItemDto,
} from "./_dto/operational-approval.dto";

interface CreateOperationalApprovalInput {
  companyId: string;
  terminalId?: string | null;
  requestedById: string;
  actionType: string;
  targetType: string;
  targetId?: string | null;
  title: string;
  summary: string;
  beforeSnapshot?: Prisma.InputJsonValue;
  afterSnapshot?: Prisma.InputJsonValue;
  idempotencyKey?: string | null;
  expiresAt?: Date | null;
}

function assertApprover(viewer: AccountsViewerDto) {
  if (viewer.role !== "admin" && viewer.role !== "manager") {
    throw new Error("Forbidden");
  }
}

function assertCompanyAccess(viewer: AccountsViewerDto, companyId: string) {
  if (viewer.role === "admin") {
    return;
  }

  if (viewer.companyId !== companyId) {
    throw new Error("Forbidden");
  }
}

async function nextApprovalReference(tx: Prisma.TransactionClient) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replaceAll("-", "");
  const count = await tx.approvalRequest.count({
    where: {
      createdAt: {
        gte: new Date(`${today.toISOString().slice(0, 10)}T00:00:00.000Z`),
      },
    },
  });

  return `APR-${datePart}-${String(count + 1).padStart(4, "0")}`;
}

export const operationalApprovalService = {
  async create(input: CreateOperationalApprovalInput): Promise<string> {
    const request = await prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const existing = await tx.approvalRequest.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { id: true },
        });

        if (existing) {
          return existing;
        }
      }

      return tx.approvalRequest.create({
        data: {
          referenceNumber: await nextApprovalReference(tx),
          companyId: input.companyId,
          terminalId: input.terminalId ?? null,
          requestedById: input.requestedById,
          actionType: input.actionType,
          targetType: input.targetType,
          targetId: input.targetId ?? null,
          title: input.title,
          summary: input.summary,
          beforeSnapshot: input.beforeSnapshot,
          afterSnapshot: input.afterSnapshot,
          idempotencyKey: input.idempotencyKey ?? null,
          expiresAt: input.expiresAt ?? null,
        },
        select: { id: true },
      });
    });

    await notificationEventsService.publish({
      companyId: input.companyId,
      category: "APPROVAL",
      type: "approval_requested",
      title: input.title,
      body: input.summary,
      href: "/approvals",
      relatedEntityType: "approval_request",
      relatedEntityId: request.id,
      roles: ["manager"],
    });

    return request.id;
  },

  async listPending(
    viewer: AccountsViewerDto,
  ): Promise<OperationalApprovalListItemDto[]> {
    assertApprover(viewer);

    const approvals = await prisma.approvalRequest.findMany({
      where: {
        status: "pending",
        ...(viewer.role === "manager" ? { companyId: viewer.companyId ?? "" } : {}),
      },
      select: {
        id: true,
        referenceNumber: true,
        companyId: true,
        terminalId: true,
        requestedBy: { select: { fullName: true, email: true } },
        actionType: true,
        targetType: true,
        targetId: true,
        title: true,
        summary: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return approvals.map(mapOperationalApprovalToListItem);
  },

  async decide(
    viewer: AccountsViewerDto,
    approvalId: string,
    decision: "approved" | "rejected",
    input: DecideOperationalApprovalInputDto,
  ): Promise<void> {
    assertApprover(viewer);

    const approval = await prisma.approvalRequest.findUnique({
      where: { id: approvalId },
      select: {
        id: true,
        referenceNumber: true,
        companyId: true,
        terminalId: true,
        status: true,
        title: true,
      },
    });

    if (!approval) {
      throw new Error("Approval request not found.");
    }

    assertCompanyAccess(viewer, approval.companyId);

    if (approval.status !== "pending") {
      throw new Error("Only pending approval requests can be decided.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.approvalDecision.create({
        data: {
          approvalRequestId: approval.id,
          decidedById: viewer.profileId,
          decision,
          note: input.note?.trim() || null,
        },
      });

      await tx.approvalRequest.update({
        where: { id: approval.id },
        data: { status: decision },
      });

      await auditLogService.create(tx, {
        companyId: approval.companyId,
        actorProfileId: viewer.profileId,
        posTerminalId: approval.terminalId,
        actionType: `APPROVAL_${decision.toUpperCase()}`,
        referenceId: approval.id,
        changes: `${approval.referenceNumber}: ${approval.title}`,
      });
    });
  },
};
