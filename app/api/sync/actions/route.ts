import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { orderService } from "@/app/(protected)/pos/_services/order.service";
import { sessionMutationService } from "@/app/(protected)/pos/_services/session-mutation.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { readJsonWithLimit } from "@/lib/security/payload";
import { securityConfig } from "@/lib/security/security-config";
import { toSafeActionError } from "@/lib/security/safe-action-error";
import type {
  QueuedCloseSessionAction,
  QueuedPosAction,
  QueuedSaleAction,
  QueuedVoidAction,
  QueuedWithdrawAction,
  SyncActionResultDto,
} from "@/app/(protected)/pos/_services/_dto/offline.dto";
import { syncActionsRequestSchema } from "@/app/(protected)/pos/_services/_validators/offline-sync.schema";

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return null;
  }

  return prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: {
      id: true,
      companyId: true,
      role: true,
      fullName: true,
    },
  });
}

function buildReviewResult(
  localId: string,
  message: string,
): SyncActionResultDto {
  return {
    localId,
    syncStatus: "needs_review",
    error: message,
    receipt: null,
    payload: null,
  };
}

function buildFailedResult(
  localId: string,
  message: string,
): SyncActionResultDto {
  return {
    localId,
    syncStatus: "failed",
    error: message,
    receipt: null,
    payload: null,
  };
}

function syncIssueCategory(action: QueuedPosAction, message: string) {
  const text = `${action.type} ${message}`.toLowerCase();

  if (text.includes("manager") || text.includes("approval"))
    return "manager_approval";
  if (
    text.includes("session") ||
    text.includes("terminal") ||
    text.includes("device")
  )
    return "session_recovery";
  if (text.includes("stock") || text.includes("inventory")) return "inventory";
  if (
    text.includes("payment") ||
    text.includes("invoice") ||
    text.includes("idempotency")
  )
    return "payment_recovery";
  if (text.includes("cash") || text.includes("withdraw")) return "cash_control";

  return "sync_replay";
}

async function upsertSyncIssue(
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  action: QueuedPosAction,
  result: SyncActionResultDto,
) {
  if (
    !profile.companyId ||
    !["failed", "needs_review"].includes(result.syncStatus)
  ) {
    return;
  }

  const message =
    result.error ?? "Queued action needs review before it can be recovered.";
  const syncStatus = result.syncStatus === "failed" ? "failed" : "needs_review";

  await prisma.offlineSyncIssue.upsert({
    where: {
      companyId_localId: {
        companyId: profile.companyId,
        localId: action.localId,
      },
    },
    create: {
      companyId: profile.companyId,
      terminalId: action.terminalId,
      localId: action.localId,
      actionType: action.type,
      syncStatus,
      conflictCategory: syncIssueCategory(action, message),
      message,
      idempotencyKey: action.idempotencyKey,
      retryCount: action.retryCount ?? 0,
      nextRetryAt: action.nextRetryAt ? new Date(action.nextRetryAt) : null,
      payload: action as unknown as Prisma.InputJsonValue,
    },
    update: {
      terminalId: action.terminalId,
      actionType: action.type,
      syncStatus,
      conflictCategory: syncIssueCategory(action, message),
      message,
      idempotencyKey: action.idempotencyKey,
      retryCount: action.retryCount ?? 0,
      nextRetryAt: action.nextRetryAt ? new Date(action.nextRetryAt) : null,
      payload: action as unknown as Prisma.InputJsonValue,
      resolvedAt: null,
    },
  });
}

async function resolveSyncIssue(
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  action: QueuedPosAction,
) {
  if (!profile.companyId) return;

  await prisma.offlineSyncIssue.updateMany({
    where: {
      companyId: profile.companyId,
      localId: action.localId,
      syncStatus: { in: ["pending", "syncing", "failed", "needs_review"] },
    },
    data: {
      syncStatus: "resolved",
      message: "Queued action synced successfully.",
      resolvedAt: new Date(),
    },
  });
}

async function pushSyncResult(
  results: SyncActionResultDto[],
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  action: QueuedPosAction,
  result: SyncActionResultDto,
) {
  results.push(result);

  if (profile.companyId) {
    const actionType =
      result.syncStatus === "synced"
        ? "OFFLINE_SYNC_RETRY_SUCCEEDED"
        : result.syncStatus === "failed"
          ? "OFFLINE_SYNC_RETRY_FAILED"
          : "OFFLINE_SYNC_NEEDS_REVIEW";

    await auditLogService.create(prisma, {
      companyId: profile.companyId,
      actorProfileId: profile.id,
      posTerminalId: action.terminalId,
      actionType,
      referenceId: action.localId,
      changes:
        result.error ??
        `${action.type.replaceAll("_", " ").toLowerCase()} replay ${result.syncStatus}.`,
    });
  }

  if (result.syncStatus === "synced") {
    await resolveSyncIssue(profile, action);
    return;
  }

  await upsertSyncIssue(profile, action, result);
}

async function validateQueuedActionAccess(
  profileId: string,
  action: QueuedPosAction,
) {
  const timestamp = await prisma.timestamp.findFirst({
    where: {
      id: action.timestampId,
      cashierId: profileId,
      posTerminalId: action.terminalId,
    },
    select: {
      id: true,
      cashierId: true,
      posTerminalId: true,
      timestampOut: true,
      deviceId: true,
      forceClosedAt: true,
    },
  });

  if (!timestamp) {
    return { ok: false as const, reason: "Session context no longer exists." };
  }

  if (timestamp.forceClosedAt) {
    return {
      ok: false as const,
      reason:
        "Terminal session was force-closed while this device was offline.",
    };
  }

  if (timestamp.timestampOut && action.type !== "CLOSE_SESSION") {
    return {
      ok: false as const,
      reason: "Terminal session is already closed and needs review.",
    };
  }

  if (timestamp.deviceId && timestamp.deviceId !== action.deviceId) {
    return {
      ok: false as const,
      reason: "Queued action belongs to a different device.",
    };
  }

  return { ok: true as const };
}

async function processSale(
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  action: QueuedSaleAction,
): Promise<SyncActionResultDto> {
  const order = {
    ...action.payload.order,
    invoiceNumber: undefined,
  };
  const receipt = await orderService.payOrder({
    ...order,
    timestampId: action.timestampId,
    deviceId: action.deviceId,
    idempotencyKey: action.idempotencyKey,
    localInvoiceNo: action.payload.invoiceNoLocal,
  });

  return {
    localId: action.localId,
    syncStatus: "synced",
    error: null,
    receipt,
    payload: null,
  };
}

async function processVoid(
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  action: QueuedVoidAction,
): Promise<SyncActionResultDto> {
  await orderService.cancelOrder({
    order: {
      ...action.payload.order,
      timestampId: action.timestampId,
      deviceId: action.deviceId,
    },
    managerIdentifier: action.payload.managerEmail,
    reason: action.payload.reason,
  });

  return {
    localId: action.localId,
    syncStatus: "synced",
    error: null,
    receipt: null,
    payload: { reason: action.payload.reason },
  };
}

async function hasProcessedNonSaleAction(idempotencyKey: string) {
  const existing = await prisma.auditLog.findFirst({
    where: {
      actionType: "OFFLINE_SYNC_APPLIED",
      changes: `idempotency:${idempotencyKey}`,
    },
    select: { id: true },
  });

  return Boolean(existing);
}

async function markNonSaleActionProcessed(input: {
  companyId: string;
  actorProfileId: string;
  posTerminalId: string;
  referenceId: string;
  idempotencyKey: string;
}) {
  await auditLogService.create(prisma, {
    companyId: input.companyId,
    actorProfileId: input.actorProfileId,
    posTerminalId: input.posTerminalId,
    actionType: "OFFLINE_SYNC_APPLIED",
    referenceId: input.referenceId,
    changes: `idempotency:${input.idempotencyKey}`,
  });
}

async function processWithdrawal(
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  action: QueuedWithdrawAction,
): Promise<SyncActionResultDto> {
  void profile;
  return buildReviewResult(
    action.localId,
    "Offline cash withdrawal requires online manager approval review.",
  );
}

async function processClose(
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  action: QueuedCloseSessionAction,
): Promise<SyncActionResultDto> {
  void profile;
  return buildReviewResult(
    action.localId,
    "Offline session close requires online manager approval review.",
  );
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    await enforceRateLimit({
      bucket: "sync",
      route: "/api/sync/actions",
      action: "OFFLINE_SYNC_ACTIONS",
      profileId: profile.id,
      userId: profile.id,
      role: profile.role,
      companyId: profile.companyId,
    });
    const parsed = syncActionsRequestSchema.safeParse(
      await readJsonWithLimit(request, securityConfig.payload.syncBytes),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Malformed sync payload." },
        { status: 400 },
      );
    }
    const actions = parsed.data.actions as QueuedPosAction[];
    if (actions.length > 100) {
      return NextResponse.json(
        { success: false, error: "Sync batch is too large." },
        { status: 400 },
      );
    }

    const sortedActions = [...actions].sort((a, b) =>
      a.createdAtLocal.localeCompare(b.createdAtLocal),
    );

    const results: SyncActionResultDto[] = [];

    for (const action of sortedActions) {
      if (
        action.companyId !== profile.companyId ||
        action.cashierId !== profile.id
      ) {
        await pushSyncResult(
          results,
          profile,
          action,
          buildReviewResult(
            action.localId,
            "Queued action no longer belongs to the signed-in cashier.",
          ),
        );
        continue;
      }

      const access = await validateQueuedActionAccess(profile.id, action);
      if (!access.ok) {
        await pushSyncResult(
          results,
          profile,
          action,
          buildReviewResult(action.localId, access.reason),
        );
        continue;
      }

      try {
        if (action.type !== "CLOSE_SESSION") {
          await sessionMutationService.touchTimestamp(
            action.timestampId,
            action.deviceId,
          );
        }

        switch (action.type) {
          case "PAY_ORDER":
            await pushSyncResult(
              results,
              profile,
              action,
              await processSale(profile, action),
            );
            break;
          case "VOID_ORDER":
            if (await hasProcessedNonSaleAction(action.idempotencyKey)) {
              await pushSyncResult(results, profile, action, {
                localId: action.localId,
                syncStatus: "synced",
                error: null,
                receipt: null,
                payload: null,
              });
              break;
            }
            await pushSyncResult(
              results,
              profile,
              action,
              await processVoid(profile, action),
            );
            await markNonSaleActionProcessed({
              companyId: profile.companyId,
              actorProfileId: profile.id,
              posTerminalId: action.terminalId,
              referenceId: action.timestampId,
              idempotencyKey: action.idempotencyKey,
            });
            break;
          case "WITHDRAW_CASH":
            if (await hasProcessedNonSaleAction(action.idempotencyKey)) {
              await pushSyncResult(results, profile, action, {
                localId: action.localId,
                syncStatus: "synced",
                error: null,
                receipt: null,
                payload: null,
              });
              break;
            }
            await pushSyncResult(
              results,
              profile,
              action,
              await processWithdrawal(profile, action),
            );
            break;
          case "CLOSE_SESSION":
            if (await hasProcessedNonSaleAction(action.idempotencyKey)) {
              await pushSyncResult(results, profile, action, {
                localId: action.localId,
                syncStatus: "synced",
                error: null,
                receipt: null,
                payload: null,
              });
              break;
            }
            await pushSyncResult(
              results,
              profile,
              action,
              await processClose(profile, action),
            );
            break;
        }
      } catch (error) {
        const message = toSafeActionError(
          error,
          "Unable to sync queued action.",
        );

        await pushSyncResult(
          results,
          profile,
          action,
          /force-closed|different device|needs review/i.test(message)
            ? buildReviewResult(action.localId, message)
            : buildFailedResult(action.localId, message),
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: { results },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error &&
          error.message.startsWith("Too many requests")
            ? error.message
            : "Unable to sync offline actions.",
      },
      {
        status:
          error instanceof Error &&
          error.message.startsWith("Too many requests")
            ? 429
            : 500,
      },
    );
  }
}
