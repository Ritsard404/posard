"use client";

import type {
  LocalSaleRecordDto,
  OfflineBootstrapDto,
  QueuedPosAction,
  QueuedSaleAction,
  SyncBatchResultDto,
} from "./_dto/offline.dto";
import {
  fetchJsonWithRecovery,
  toFetchRecoveryError,
} from "@/lib/fetch-recovery";
import {
  getOfflineBootstrapFallback,
  posOfflineDb,
  saveOfflineBootstrap,
} from "./offline-db.client";

let syncInFlight: Promise<SyncBatchResultDto> | null = null;

function getRetryDelayMs(retryCount: number) {
  return Math.min(60_000, 2_000 * 2 ** Math.min(retryCount, 5));
}

async function notifyServiceWorkerToSync() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) {
    return;
  }

  if ("sync" in registration) {
    try {
      await (
        registration as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> };
        }
      ).sync.register("posard-sync-actions");
      return;
    } catch {
      // Fall through to foreground retry.
    }
  }

  registration.active?.postMessage({ type: "POSARD_SYNC_TRIGGER" });
}

export async function registerPOSServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

export async function fetchOfflineBootstrap(deviceId: string) {
  try {
    const payload = await fetchJsonWithRecovery<
      | { success: true; data: OfflineBootstrapDto }
      | { success: false; error: string }
    >(`/api/sync/bootstrap?deviceId=${encodeURIComponent(deviceId)}`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      retries: 2,
      timeoutMs: 8_000,
    });

    if (!payload.success) {
      throw new Error(payload.error || "Unable to refresh offline bootstrap.");
    }

    await saveOfflineBootstrap(payload.data);
    return payload.data;
  } catch (error) {
    const classified = toFetchRecoveryError(error);
    const fallback = await getOfflineBootstrapFallback(classified.safeMessage);

    if (fallback) {
      return fallback;
    }

    throw new Error(classified.safeMessage);
  }
}

export async function enqueueOfflineAction(action: QueuedPosAction) {
  await posOfflineDb.queuedActions.put(action);
  void notifyServiceWorkerToSync().catch(() => undefined);
}

export async function commitLocalSale(input: {
  action: QueuedSaleAction;
  localSequenceNumber: number;
}) {
  const now = new Date().toISOString();
  const sale: LocalSaleRecordDto = {
    id: input.action.localId,
    clientTxnId: input.action.idempotencyKey,
    terminalId: input.action.terminalId,
    cashierId: input.action.cashierId,
    invoiceNumber:
      input.action.payload.invoiceNumber ??
      input.action.payload.receipt.invoiceNumber ??
      null,
    localSequenceNumber: input.localSequenceNumber,
    payload: input.action.payload,
    receipt: input.action.payload.receipt,
    syncStatus: "pending",
    retryCount: 0,
    syncError: null,
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
    offlineCreatedAt: input.action.createdAtLocal,
  };

  await posOfflineDb.transaction(
    "rw",
    posOfflineDb.sales,
    posOfflineDb.queuedActions,
    async () => {
      const existing = await posOfflineDb.sales
        .where("clientTxnId")
        .equals(input.action.idempotencyKey)
        .first();

      if (existing) {
        return;
      }

      await posOfflineDb.sales.put(sale);
      await posOfflineDb.queuedActions.put(input.action);
    },
  );

  if (process.env.NODE_ENV !== "production") {
    console.info("POS local checkout commit", {
      clientTxnId: input.action.idempotencyKey,
      localId: input.action.localId,
      committedAt: now,
    });
  }

  void notifyServiceWorkerToSync().catch(() => undefined);
}

export async function getOfflineQueueSnapshot() {
  const actions = await posOfflineDb.queuedActions.toArray();
  return {
    actions,
    pendingCount: actions.filter((action) => action.syncStatus === "pending")
      .length,
    syncingCount: actions.filter((action) => action.syncStatus === "syncing")
      .length,
    needsReviewCount: actions.filter(
      (action) => action.syncStatus === "needs_review",
    ).length,
  };
}

export async function syncOfflineActions() {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = syncOfflineActionsInternal().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

async function syncOfflineActionsInternal() {
  const now = new Date().toISOString();
  const actions = await posOfflineDb.queuedActions
    .where("syncStatus")
    .anyOf(["pending", "failed", "syncing"])
    .filter((action) => !action.nextRetryAt || action.nextRetryAt <= now)
    .sortBy("createdAtLocal");

  if (actions.length === 0) {
    return { results: [] } satisfies SyncBatchResultDto;
  }

  await Promise.all(
    actions.map((action) =>
      posOfflineDb.queuedActions.update(action.localId, {
        syncStatus: "syncing",
      }),
    ),
  );
  await Promise.all(
    actions
      .filter((action) => action.type === "PAY_ORDER")
      .map((action) =>
        posOfflineDb.sales.update(action.localId, {
          syncStatus: "syncing",
          updatedAt: new Date().toISOString(),
        }),
      ),
  );

  let payload:
    | { success: true; data: SyncBatchResultDto }
    | { success: false; error: string };

  try {
    payload = await fetchJsonWithRecovery<
      | { success: true; data: SyncBatchResultDto }
      | { success: false; error: string }
    >("/api/sync/actions", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actions }),
      retries: 0,
      timeoutMs: 15_000,
    });
  } catch (error) {
    const message = toFetchRecoveryError(error).safeMessage;
    await Promise.all(
      actions.map((action) =>
        posOfflineDb.queuedActions.update(action.localId, {
          syncStatus: "failed",
          lastError: message,
          retryCount: (action.retryCount ?? 0) + 1,
          nextRetryAt: new Date(
            Date.now() + getRetryDelayMs(action.retryCount ?? 0),
          ).toISOString(),
        }),
      ),
    );
    await Promise.all(
      actions
        .filter((action) => action.type === "PAY_ORDER")
        .map((action) =>
          posOfflineDb.sales.update(action.localId, {
            syncStatus: "failed",
            retryCount: (action.retryCount ?? 0) + 1,
            syncError: message,
            updatedAt: new Date().toISOString(),
          }),
        ),
    );
    throw new Error(message);
  }

  if (!payload.success) {
    const message = payload.error || "Unable to sync offline actions.";
    await Promise.all(
      actions.map((action) =>
        posOfflineDb.queuedActions.update(action.localId, {
          syncStatus: "failed",
          lastError: message,
          retryCount: (action.retryCount ?? 0) + 1,
          nextRetryAt: new Date(
            Date.now() + getRetryDelayMs(action.retryCount ?? 0),
          ).toISOString(),
        }),
      ),
    );
    await Promise.all(
      actions
        .filter((action) => action.type === "PAY_ORDER")
        .map((action) =>
          posOfflineDb.sales.update(action.localId, {
            syncStatus: "failed",
            retryCount: (action.retryCount ?? 0) + 1,
            syncError: message,
            updatedAt: new Date().toISOString(),
          }),
        ),
    );
    throw new Error(message);
  }

  for (const result of payload.data.results) {
    const action = actions.find((item) => item.localId === result.localId);
    const retryCount =
      (action?.retryCount ?? 0) + (result.syncStatus === "failed" ? 1 : 0);
    const nextRetryAt =
      result.syncStatus === "failed"
        ? new Date(
            Date.now() + getRetryDelayMs(action?.retryCount ?? 0),
          ).toISOString()
        : null;

    await posOfflineDb.queuedActions.update(result.localId, {
      syncStatus: result.syncStatus,
      lastError: result.error,
      retryCount,
      nextRetryAt,
      syncedAt:
        result.syncStatus === "synced" ? new Date().toISOString() : null,
    });
    if (action?.type === "PAY_ORDER") {
      await posOfflineDb.sales.update(result.localId, {
        syncStatus: result.syncStatus,
        ...(result.receipt ? { receipt: result.receipt } : {}),
        retryCount,
        syncError: result.error,
        updatedAt: new Date().toISOString(),
        syncedAt:
          result.syncStatus === "synced" ? new Date().toISOString() : null,
      });
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("POS background sync timing", {
      actionCount: actions.length,
      syncedCount: payload.data.results.filter(
        (item) => item.syncStatus === "synced",
      ).length,
    });
  }

  return payload.data;
}
