import assert from 'node:assert/strict';
import { test } from 'node:test';

import { reconcileTransactions } from '../fixtures/reconciliation';

test('reconciles sale, corrections, expense, debt, cash, and stock invariants', () => {
  const result = reconcileTransactions({
    grossSales: 140,
    discounts: 15,
    tax: 0,
    payments: 125,
    returns: 25,
    voids: 0,
    expenses: 10,
    debtCollections: 17,
    cashDebtCollections: 17,
    openingCash: 1000,
    cashPayments: 75,
    cashRefunds: 25,
    expectedCash: 1057,
    countedCash: 1047,
    stockSold: 2,
    stockReturned: 1,
    stockVoided: 0,
    stockMovementDelta: -1,
  });

  assert.deepEqual(result, {
    grandTotal: 125,
    cashVariance: -10,
    stockDelta: -1,
  });
});
