import { expect, test } from "@playwright/test";

import { syncActionsRequestSchema } from "../../app/(protected)/pos/_services/_validators/offline-sync.schema";

function buildQueuedSale(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();

  return {
    localId: "local-sale-1",
    type: "PAY_ORDER",
    idempotencyKey: "client-txn-1",
    timestampId: "timestamp-1",
    terminalId: "terminal-1",
    deviceId: "device-1",
    cashierId: "cashier-1",
    companyId: "company-1",
    createdAtLocal: now,
    syncStatus: "pending",
    retryCount: 0,
    nextRetryAt: null,
    lastError: null,
    syncedAt: null,
    payload: {
      order: {
        timestampId: "timestamp-1",
        deviceId: "device-1",
        idempotencyKey: "client-txn-1",
        localInvoiceNo: "OFF-TERM-20260505-0001",
        items: [
          {
            productId: "product-1",
            qty: 1,
            price: 100,
            subTotal: 100,
            status: "PAID",
          },
        ],
        cashTenderAmount: 100,
        settlementMode: "pay_now",
      },
      invoiceNoLocal: "OFF-TERM-20260505-0001",
      stockSnapshotVersion: "snapshot-1",
      receipt: {
        id: "local-receipt-1",
        invoiceNumber: 0,
        localInvoiceNo: "OFF-TERM-20260505-0001",
        isProvisional: true,
        syncStatus: "pending",
        syncError: null,
        createdAt: now,
      },
    },
    ...overrides,
  };
}

test.describe("local-first POS sync payload", () => {
  test("accepts a queued local sale with a client transaction id and receipt snapshot", () => {
    const parsed = syncActionsRequestSchema.safeParse({
      actions: [buildQueuedSale()],
    });

    expect(parsed.success).toBe(true);
  });

  test("rejects a queued sale without an idempotency key", () => {
    const parsed = syncActionsRequestSchema.safeParse({
      actions: [buildQueuedSale({ idempotencyKey: "" })],
    });

    expect(parsed.success).toBe(false);
  });
});
