"use client";

import Dexie, { type Table } from "dexie";
import type {
  ManagerVerifierDto,
  LocalSaleRecordDto,
  OfflineBootstrapDto,
  QueuedPosAction,
  SessionSnapshotDto,
} from "./_dto/offline.dto";
import type { CategoryDto, EPaymentMethodDto, ProductDto } from "./_dto/pos.dto";

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
  catalogSnapshot!: Table<SnapshotEnvelope<{ categories: CategoryDto[]; products: ProductDto[] }>, string>;
  paymentMethodSnapshot!: Table<SnapshotEnvelope<EPaymentMethodDto[]>, string>;
  managerVerifierSnapshot!: Table<SnapshotEnvelope<ManagerVerifierDto[]>, string>;
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
  }
}

export const posOfflineDb = new POSOfflineDexie();

export async function saveOfflineBootstrap(bootstrap: OfflineBootstrapDto) {
  const updatedAt = bootstrap.fetchedAt;
  await posOfflineDb.sessionSnapshot.put({
    key: "active-session",
    value: bootstrap.session,
    updatedAt,
  });
  await posOfflineDb.catalogSnapshot.put({
    key: "catalog",
    value: {
      categories: bootstrap.metadata.categories,
      products: bootstrap.metadata.products,
    },
    updatedAt,
  });
  await posOfflineDb.paymentMethodSnapshot.put({
    key: "payment-methods",
    value: bootstrap.metadata.epaymentMethods,
    updatedAt,
  });
  await posOfflineDb.managerVerifierSnapshot.put({
    key: "manager-verifiers",
    value: bootstrap.managerVerifiers,
    updatedAt,
  });
  await posOfflineDb.syncMeta.put({
    key: "stock-snapshot-version",
    value: bootstrap.stockSnapshotVersion,
    updatedAt,
  });
}

export async function getOfflineSessionSnapshot() {
  return (await posOfflineDb.sessionSnapshot.get("active-session"))?.value ?? null;
}

export async function clearOfflineSessionSnapshot() {
  await posOfflineDb.sessionSnapshot.delete("active-session");
}

export async function getOfflineCatalogSnapshot() {
  const catalog = await posOfflineDb.catalogSnapshot.get("catalog");
  const methods = await posOfflineDb.paymentMethodSnapshot.get("payment-methods");

  return {
    categories: catalog?.value.categories ?? [],
    products: catalog?.value.products ?? [],
    epaymentMethods: methods?.value ?? [],
  };
}

export async function getOfflineManagerVerifiers() {
  return (
    (await posOfflineDb.managerVerifierSnapshot.get("manager-verifiers"))?.value ?? []
  );
}

export async function getStockSnapshotVersion() {
  return (
    (await posOfflineDb.syncMeta.get("stock-snapshot-version"))?.value ?? "snapshot-missing"
  );
}
