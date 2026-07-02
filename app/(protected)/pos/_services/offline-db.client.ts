"use client";

import Dexie, { type Table } from "dexie";
import type {
  ManagerVerifierDto,
  LocalSaleRecordDto,
  OfflineBootstrapDto,
  QueuedPosAction,
  SessionSnapshotDto,
} from "./_dto/offline.dto";
import type {
  CategoryDto,
  EPaymentMethodDto,
  ProductDto,
} from "./_dto/pos.dto";

interface SnapshotEnvelope<T> {
  key: string;
  value: T;
  updatedAt: string;
}

interface SyncMetaRecord {
  key: string;
  value: string;
  updatedAt: string;
}

class POSOfflineDexie extends Dexie {
  sales!: Table<LocalSaleRecordDto, string>;
  queuedActions!: Table<QueuedPosAction, string>;
  sessionSnapshot!: Table<SnapshotEnvelope<SessionSnapshotDto | null>, string>;
  catalogSnapshot!: Table<
    SnapshotEnvelope<{ categories: CategoryDto[]; products: ProductDto[] }>,
    string
  >;
  paymentMethodSnapshot!: Table<SnapshotEnvelope<EPaymentMethodDto[]>, string>;
  managerVerifierSnapshot!: Table<
    SnapshotEnvelope<ManagerVerifierDto[]>,
    string
  >;
  syncMeta!: Table<SyncMetaRecord, string>;

  constructor() {
    super("posard-offline-pos");

    this.version(1).stores({
      queuedActions:
        "localId, syncStatus, type, createdAtLocal, timestampId, terminalId, companyId",
      sessionSnapshot: "key, updatedAt",
      catalogSnapshot: "key, updatedAt",
      paymentMethodSnapshot: "key, updatedAt",
      managerVerifierSnapshot: "key, updatedAt",
      syncMeta: "key, updatedAt",
    });

    this.version(2).stores({
      sales:
        "id, clientTxnId, syncStatus, terminalId, cashierId, localSequenceNumber, createdAt, syncedAt",
      queuedActions:
        "localId, syncStatus, type, createdAtLocal, timestampId, terminalId, companyId, idempotencyKey, nextRetryAt",
      sessionSnapshot: "key, updatedAt",
      catalogSnapshot: "key, updatedAt",
      paymentMethodSnapshot: "key, updatedAt",
      managerVerifierSnapshot: "key, updatedAt",
      syncMeta: "key, updatedAt",
    });

    this.version(3).stores({
      sales:
        "id, clientTxnId, syncStatus, terminalId, cashierId, invoiceNumber, localSequenceNumber, createdAt, syncedAt",
      queuedActions:
        "localId, syncStatus, type, createdAtLocal, timestampId, terminalId, companyId, idempotencyKey, nextRetryAt",
      invoicePool: "id, nextAvailable, poolEnd, updatedAt",
      sessionSnapshot: "key, updatedAt",
      catalogSnapshot: "key, updatedAt",
      paymentMethodSnapshot: "key, updatedAt",
      managerVerifierSnapshot: "key, updatedAt",
      syncMeta: "key, updatedAt",
    });

    this.version(4).stores({
      sales:
        "id, clientTxnId, syncStatus, terminalId, cashierId, invoiceNumber, localSequenceNumber, createdAt, syncedAt",
      queuedActions:
        "localId, syncStatus, type, createdAtLocal, timestampId, terminalId, companyId, idempotencyKey, nextRetryAt",
      invoicePool: null,
      sessionSnapshot: "key, updatedAt",
      catalogSnapshot: "key, updatedAt",
      paymentMethodSnapshot: "key, updatedAt",
      managerVerifierSnapshot: "key, updatedAt",
      syncMeta: "key, updatedAt",
    });
  }
}

export const posOfflineDb = new POSOfflineDexie();

function upsertById<T extends { id: string }>(current: T[], changes: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of changes) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

function removeById<T extends { id: string }>(current: T[], removedIds: string[] = []) {
  if (removedIds.length === 0) return current;
  const removed = new Set(removedIds);
  return current.filter((item) => !removed.has(item.id));
}

export async function saveOfflineBootstrap(bootstrap: OfflineBootstrapDto) {
  const updatedAt = bootstrap.fetchedAt;
  const existingCatalog = await posOfflineDb.catalogSnapshot.get("catalog");
  const existingPaymentMethods =
    await posOfflineDb.paymentMethodSnapshot.get("payment-methods");
  const isDelta = bootstrap.sync?.mode === "delta";
  const categories = isDelta
    ? removeById(
        upsertById(existingCatalog?.value.categories ?? [], bootstrap.metadata.categories),
        bootstrap.sync?.removed.categoryIds,
      )
    : bootstrap.metadata.categories;
  const products = isDelta
    ? removeById(
        upsertById(existingCatalog?.value.products ?? [], bootstrap.metadata.products),
        bootstrap.sync?.removed.productIds,
      )
    : bootstrap.metadata.products;
  const epaymentMethods = isDelta
    ? upsertById(existingPaymentMethods?.value ?? [], bootstrap.metadata.epaymentMethods)
    : bootstrap.metadata.epaymentMethods;
  const syncCursor = bootstrap.sync?.cursor ?? bootstrap.stockSnapshotVersion;

  await posOfflineDb.sessionSnapshot.put({
    key: "active-session",
    value: bootstrap.session,
    updatedAt,
  });
  await posOfflineDb.catalogSnapshot.put({
    key: "catalog",
    value: {
      categories,
      products,
    },
    updatedAt,
  });
  await posOfflineDb.paymentMethodSnapshot.put({
    key: "payment-methods",
    value: epaymentMethods,
    updatedAt,
  });
  await posOfflineDb.managerVerifierSnapshot.put({
    key: "manager-verifiers",
    value: bootstrap.managerVerifiers,
    updatedAt,
  });
  await posOfflineDb.syncMeta.put({
    key: "stock-snapshot-version",
    value: syncCursor,
    updatedAt,
  });
  await posOfflineDb.syncMeta.put({
    key: "bootstrap-sync-cursor",
    value: syncCursor,
    updatedAt,
  });
}

export async function getOfflineSessionSnapshot() {
  return (
    (await posOfflineDb.sessionSnapshot.get("active-session"))?.value ?? null
  );
}

export async function clearOfflineSessionSnapshot() {
  await posOfflineDb.sessionSnapshot.delete("active-session");
}

export async function getOfflineCatalogSnapshot() {
  const catalog = await posOfflineDb.catalogSnapshot.get("catalog");
  const methods =
    await posOfflineDb.paymentMethodSnapshot.get("payment-methods");

  return {
    categories: catalog?.value.categories ?? [],
    products: catalog?.value.products ?? [],
    epaymentMethods: methods?.value ?? [],
  };
}

export async function getOfflineManagerVerifiers() {
  return (
    (await posOfflineDb.managerVerifierSnapshot.get("manager-verifiers"))
      ?.value ?? []
  );
}

export async function getStockSnapshotVersion() {
  return (
    (await posOfflineDb.syncMeta.get("stock-snapshot-version"))?.value ??
    "snapshot-missing"
  );
}

export async function getBootstrapSyncCursor() {
  return (
    (await posOfflineDb.syncMeta.get("bootstrap-sync-cursor"))?.value ??
    null
  );
}

export async function getOfflineBootstrapFallback(
  warning = "Using saved product and session data while the connection recovers.",
) {
  const [sessionRecord, catalogRecord, methodsRecord, managerVerifierRecord, stockSnapshotVersion] =
    await Promise.all([
      posOfflineDb.sessionSnapshot.get("active-session"),
      posOfflineDb.catalogSnapshot.get("catalog"),
      posOfflineDb.paymentMethodSnapshot.get("payment-methods"),
      posOfflineDb.managerVerifierSnapshot.get("manager-verifiers"),
      getStockSnapshotVersion(),
    ]);
  const session = sessionRecord?.value ?? null;
  const catalog = {
    categories: catalogRecord?.value.categories ?? [],
    products: catalogRecord?.value.products ?? [],
    epaymentMethods: methodsRecord?.value ?? [],
  };
  const managerVerifiers = managerVerifierRecord?.value ?? [];

  if (
    !session &&
    catalog.products.length === 0 &&
    catalog.categories.length === 0 &&
    catalog.epaymentMethods.length === 0
  ) {
    return null;
  }

  const snapshotAges = [
    catalogRecord?.updatedAt,
    methodsRecord?.updatedAt,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));
  const staleAgeMinutes =
    snapshotAges.length > 0
      ? Math.max(0, Math.floor((Date.now() - Math.max(...snapshotAges)) / 60_000))
      : null;
  const ageWarning =
    staleAgeMinutes === null
      ? warning
      : `${warning} Saved data is about ${staleAgeMinutes} minute${staleAgeMinutes === 1 ? "" : "s"} old.`;

  return {
    session,
    metadata: {
      products: catalog.products,
      categories: catalog.categories,
      epaymentMethods: catalog.epaymentMethods,
    },
    managerVerifiers,
    fetchedAt: new Date().toISOString(),
    stockSnapshotVersion,
    isStale: true,
    staleAgeMinutes,
    warning: ageWarning,
  };
}
