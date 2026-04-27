"use client";

import type {
  OfflineBootstrapDto,
  QueuedPosAction,
  SyncBatchResultDto,
} from "./_dto/offline.dto";
import { posOfflineDb, saveOfflineBootstrap } from "./offline-db.client";

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
      await (registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> };
      }).sync.register("posard-sync-actions");
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

  await navigator.serviceWorker.register("/pos-sw.js");
}

export async function fetchOfflineBootstrap(deviceId: string) {
  const response = await fetch(
    `/api/sync/bootstrap?deviceId=${encodeURIComponent(deviceId)}`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as
    | { success: true; data: OfflineBootstrapDto }
    | { success: false; error: string };

  if (!payload.success) {
    throw new Error(payload.error || "Unable to refresh offline bootstrap.");
  }

  await saveOfflineBootstrap(payload.data);
  return payload.data;
}

export async function enqueueOfflineAction(action: QueuedPosAction) {
  await posOfflineDb.queuedActions.put(action);
  await notifyServiceWorkerToSync();
}

export async function getOfflineQueueSnapshot() {
  const actions = await posOfflineDb.queuedActions.toArray();
  return {
    actions,
    pendingCount: actions.filter((action) => action.syncStatus === "pending").length,
    syncingCount: actions.filter((action) => action.syncStatus === "syncing").length,
    needsReviewCount: actions.filter((action) => action.syncStatus === "needs_review")
      .length,
  };
}

export async function syncOfflineActions() {
  const actions = await posOfflineDb.queuedActions
    .where("syncStatus")
    .anyOf(["pending", "failed", "syncing"])
    .sortBy("createdAtLocal");

  if (actions.length === 0) {
    return { results: [] } satisfies SyncBatchResultDto;
  }

  await Promise.all(
    actions.map((action) =>
      posOfflineDb.queuedActions.update(action.localId, { syncStatus: "syncing" }),
    ),
  );

  const response = await fetch("/api/sync/actions", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ actions }),
  });

  const payload = (await response.json()) as
    | { success: true; data: SyncBatchResultDto }
    | { success: false; error: string };

  if (!payload.success) {
    const message = payload.error || "Unable to sync offline actions.";
    await Promise.all(
      actions.map((action) =>
        posOfflineDb.queuedActions.update(action.localId, {
          syncStatus: "failed",
          lastError: message,
        }),
      ),
    );
    throw new Error(message);
  }

  for (const result of payload.data.results) {
    await posOfflineDb.queuedActions.update(result.localId, {
      syncStatus: result.syncStatus,
      lastError: result.error,
      syncedAt: result.syncStatus === "synced" ? new Date().toISOString() : null,
    });
  }

  return payload.data;
}
