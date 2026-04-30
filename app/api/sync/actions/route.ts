import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { orderService } from "@/app/(protected)/pos/_services/order.service";
import { sessionMutationService } from "@/app/(protected)/pos/_services/session-mutation.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import type {
  QueuedCloseSessionAction,
  QueuedPosAction,
  QueuedSaleAction,
  QueuedVoidAction,
  QueuedWithdrawAction,
  SyncActionResultDto,
} from "@/app/(protected)/pos/_services/_dto/offline.dto";

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

function buildReviewResult(localId: string, message: string): SyncActionResultDto {
  return {
    localId,
    syncStatus: "needs_review",
    error: message,
    receipt: null,
    payload: null,
  };
}

function buildFailedResult(localId: string, message: string): SyncActionResultDto {
  return {
    localId,
    syncStatus: "failed",
    error: message,
    receipt: null,
    payload: null,
  };
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
      reason: "Terminal session was force-closed while this device was offline.",
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

async function processSale(profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>, action: QueuedSaleAction): Promise<SyncActionResultDto> {
  const receipt = await orderService.payOrder({
    ...action.payload.order,
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

async function processVoid(profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>, action: QueuedVoidAction): Promise<SyncActionResultDto> {
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
  await sessionMutationService.withdrawCashAuthorized(
    {
      profileId: profile.id,
      companyId: profile.companyId!,
      role: profile.role,
      fullName: profile.fullName ?? null,
    },
    action.timestampId,
    action.payload.amount,
    action.payload.managerProfileId,
  );

  return {
    localId: action.localId,
    syncStatus: "synced",
    error: null,
    receipt: null,
    payload: { amount: action.payload.amount },
  };
}

async function processClose(
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  action: QueuedCloseSessionAction,
): Promise<SyncActionResultDto> {
  const payload = await sessionMutationService.closeSessionAuthorized(
    {
      profileId: profile.id,
      companyId: profile.companyId!,
      role: profile.role,
      fullName: profile.fullName ?? null,
    },
    action.payload.sessionId,
    action.timestampId,
    action.payload.countedCash,
    action.payload.managerProfileId,
  );

  return {
    localId: action.localId,
    syncStatus: "synced",
    error: null,
    receipt: null,
    payload,
  };
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
    const body = (await request.json()) as { actions?: QueuedPosAction[] };
    const actions = Array.isArray(body.actions) ? body.actions : [];

    const sortedActions = [...actions].sort((a, b) =>
      a.createdAtLocal.localeCompare(b.createdAtLocal),
    );

    const results: SyncActionResultDto[] = [];

    for (const action of sortedActions) {
      if (action.companyId !== profile.companyId || action.cashierId !== profile.id) {
        results.push(
          buildReviewResult(action.localId, "Queued action no longer belongs to the signed-in cashier."),
        );
        continue;
      }

      const access = await validateQueuedActionAccess(profile.id, action);
      if (!access.ok) {
        results.push(buildReviewResult(action.localId, access.reason));
        continue;
      }

      try {
        if (action.type !== "CLOSE_SESSION") {
          await sessionMutationService.touchTimestamp(action.timestampId, action.deviceId);
        }

        switch (action.type) {
          case "PAY_ORDER":
            results.push(await processSale(profile, action));
            break;
          case "VOID_ORDER":
            if (await hasProcessedNonSaleAction(action.idempotencyKey)) {
              results.push({
                localId: action.localId,
                syncStatus: "synced",
                error: null,
                receipt: null,
                payload: null,
              });
              break;
            }
            results.push(await processVoid(profile, action));
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
              results.push({
                localId: action.localId,
                syncStatus: "synced",
                error: null,
                receipt: null,
                payload: null,
              });
              break;
            }
            results.push(await processWithdrawal(profile, action));
            await markNonSaleActionProcessed({
              companyId: profile.companyId,
              actorProfileId: profile.id,
              posTerminalId: action.terminalId,
              referenceId: action.timestampId,
              idempotencyKey: action.idempotencyKey,
            });
            break;
          case "CLOSE_SESSION":
            if (await hasProcessedNonSaleAction(action.idempotencyKey)) {
              results.push({
                localId: action.localId,
                syncStatus: "synced",
                error: null,
                receipt: null,
                payload: null,
              });
              break;
            }
            results.push(await processClose(profile, action));
            await markNonSaleActionProcessed({
              companyId: profile.companyId,
              actorProfileId: profile.id,
              posTerminalId: action.terminalId,
              referenceId: action.timestampId,
              idempotencyKey: action.idempotencyKey,
            });
            break;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to sync queued action.";

        results.push(
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
        error: error instanceof Error ? error.message : "Unable to sync offline actions.",
      },
      { status: 500 },
    );
  }
}
