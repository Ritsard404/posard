import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { syncActionsRequestSchema } from '../../app/(protected)/pos/_services/_validators/offline-sync.schema';

const baseAction = {
  localId: 'local-1',
  idempotencyKey: 'txn-1',
  timestampId: 'timestamp-1',
  terminalId: 'terminal-1',
  deviceId: 'device-1',
  cashierId: 'cashier-1',
  companyId: 'company-1',
  createdAtLocal: new Date().toISOString(),
  syncStatus: 'pending' as const,
  lastError: null,
  syncedAt: null,
  type: 'PAY_ORDER' as const,
  payload: {
    invoiceNoLocal: 'local-invoice-1',
    stockSnapshotVersion: 'snapshot-1',
    receipt: {
      id: 'receipt-1',
      invoiceNumber: null,
      createdAt: new Date().toISOString(),
    },
    order: {
      timestampId: 'timestamp-1',
      idempotencyKey: 'txn-1',
      items: [
        {
          productId: 'product-1',
          qty: 1,
          price: 10,
          subTotal: 10,
        },
      ],
      cashTenderAmount: 10,
    },
  },
};

describe('queued POS input validation', () => {
  test('accepts a valid sale action', () => {
    assert.equal(syncActionsRequestSchema.safeParse({ actions: [baseAction] }).success, true);
  });

  test('rejects zero or negative item quantities and amounts', () => {
    for (const invalidOrder of [
      { ...baseAction.payload.order, items: [{ ...baseAction.payload.order.items[0], qty: 0 }] },
      { ...baseAction.payload.order, items: [{ ...baseAction.payload.order.items[0], qty: -1 }] },
      { ...baseAction.payload.order, cashTenderAmount: -1 },
      { ...baseAction.payload.order, items: [{ ...baseAction.payload.order.items[0], price: -1 }] },
    ]) {
      const result = syncActionsRequestSchema.safeParse({
        actions: [{ ...baseAction, payload: { ...baseAction.payload, order: invalidOrder } }],
      });
      assert.equal(result.success, false);
    }
  });

  test('rejects missing or blank idempotency keys', () => {
    for (const idempotencyKey of ['', undefined]) {
      const result = syncActionsRequestSchema.safeParse({
        actions: [{
          ...baseAction,
          idempotencyKey,
          payload: {
            ...baseAction.payload,
            order: { ...baseAction.payload.order, idempotencyKey },
          },
        }],
      });
      assert.equal(result.success, false);
    }
  });

  test('bounds cash-out reasons and rejects script-like oversized content', () => {
    const result = syncActionsRequestSchema.safeParse({
      actions: [{
        ...baseAction,
        type: 'WITHDRAW_CASH',
        payload: {
          amount: 10,
          reason: `<script>${'x'.repeat(250)}</script>`,
        },
      }],
    });
    assert.equal(result.success, false);
  });
});
