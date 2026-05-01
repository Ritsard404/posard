import type { CategoryDto, EPaymentMethodDto, POSMetaDataDto, ProductDto } from "./pos.dto";
import type { OrderDto } from "./order.dto";
import type { PrinterConfigDto } from "./print.dto";
import type { ReceiptDto } from "./receipt.dto";

export type OfflineSyncStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "needs_review";

export type QueuedPosActionType =
  | "PAY_ORDER"
  | "VOID_ORDER"
  | "WITHDRAW_CASH"
  | "CLOSE_SESSION";

export interface QueuedActionBase {
  localId: string;
  type: QueuedPosActionType;
  idempotencyKey: string;
  timestampId: string;
  terminalId: string;
  deviceId: string;
  cashierId: string;
  companyId: string;
  createdAtLocal: string;
  syncStatus: OfflineSyncStatus;
  lastError: string | null;
  syncedAt: string | null;
}

export interface QueuedSalePayload {
  order: OrderDto;
  invoiceNoLocal: string;
  stockSnapshotVersion: string;
}

export interface QueuedVoidPayload {
  order: OrderDto;
  managerProfileId: string;
  managerEmail: string;
  managerName: string;
  reason: string;
}

export interface QueuedWithdrawPayload {
  amount: number;
  managerProfileId: string;
  managerEmail: string;
  managerName: string;
}

export interface QueuedCloseSessionPayload {
  sessionId: string;
  countedCash: number;
  managerProfileId: string;
  managerEmail: string;
  managerName: string;
}

export interface QueuedSaleAction extends QueuedActionBase {
  type: "PAY_ORDER";
  payload: QueuedSalePayload;
}

export interface QueuedVoidAction extends QueuedActionBase {
  type: "VOID_ORDER";
  payload: QueuedVoidPayload;
}

export interface QueuedWithdrawAction extends QueuedActionBase {
  type: "WITHDRAW_CASH";
  payload: QueuedWithdrawPayload;
}

export interface QueuedCloseSessionAction extends QueuedActionBase {
  type: "CLOSE_SESSION";
  payload: QueuedCloseSessionPayload;
}

export type QueuedPosAction =
  | QueuedSaleAction
  | QueuedVoidAction
  | QueuedWithdrawAction
  | QueuedCloseSessionAction;

export interface ManagerVerifierDto {
  profileId: string;
  email: string;
  name: string;
  role: string;
  pinVerifier: string;
}

export interface SessionSnapshotDto {
  timestampId: string;
  terminalId: string;
  terminalName: string;
  terminalVat: number;
  discountCapType: "amount" | "percent";
  discountMax: number;
  printerConfig: PrinterConfigDto | null;
  cashierId: string;
  cashierName: string | null;
  companyId: string;
  companyCode: string | null;
  deviceId: string | null;
  isTrainMode: boolean;
  lastSeenAt: string | null;
  billingLocked: boolean;
  billingMessage: string | null;
}

export interface OfflineBootstrapDto {
  session: SessionSnapshotDto | null;
  metadata: POSMetaDataDto;
  managerVerifiers: ManagerVerifierDto[];
  fetchedAt: string;
  stockSnapshotVersion: string;
}

export interface SyncActionResultDto {
  localId: string;
  syncStatus: OfflineSyncStatus;
  error: string | null;
  receipt: ReceiptDto | null;
  payload: Record<string, unknown> | null;
}

export interface SyncBatchResultDto {
  results: SyncActionResultDto[];
}

export interface POSOfflineStateDto {
  isOnline: boolean;
  isReady: boolean;
  deviceId: string | null;
  pendingCount: number;
  syncingCount: number;
  needsReviewCount: number;
  lastSyncMessage: string | null;
}

export interface OfflineSnapshotRecordDto {
  categories: CategoryDto[];
  products: ProductDto[];
  epaymentMethods: EPaymentMethodDto[];
}
