import assert from 'node:assert/strict';

import { cents } from './test-helpers';

export type ReconciliationInput = {
  grossSales: number;
  discounts: number;
  tax: number;
  payments: number;
  returns: number;
  voids: number;
  expenses: number;
  debtCollections: number;
  cashDebtCollections: number;
  expectedCash: number;
  countedCash: number;
  openingCash: number;
  cashPayments: number;
  cashRefunds: number;
  stockSold: number;
  stockReturned: number;
  stockVoided: number;
  stockMovementDelta: number;
};

export function reconcileTransactions(input: ReconciliationInput) {
  const netSales = cents(input.grossSales) - cents(input.discounts);
  const grandTotal = netSales + cents(input.tax);
  const netCashSales = cents(input.cashPayments) - cents(input.cashRefunds);
  const expectedCash =
    cents(input.openingCash) +
    netCashSales +
    cents(input.cashDebtCollections) -
    cents(input.expenses);
  const stockDelta = -cents(input.stockSold) + cents(input.stockReturned) + cents(input.stockVoided);

  assert.equal(cents(input.payments), grandTotal, 'payments must reconcile to grand total');
  assert.equal(cents(input.expectedCash), expectedCash, 'cash drawer must reconcile');
  assert.ok(
    cents(input.cashDebtCollections) <= cents(input.debtCollections),
    'cash debt collections cannot exceed total debt collections',
  );
  assert.equal(cents(input.stockMovementDelta), stockDelta, 'stock movements must reconcile');
  for (const [label, amount] of [
    ['returns', input.returns],
    ['voids', input.voids],
    ['expenses', input.expenses],
    ['debt collections', input.debtCollections],
  ] as const) {
    assert.ok(cents(amount) >= 0, `${label} must not be negative`);
  }

  return {
    grandTotal: grandTotal / 100,
    cashVariance: (cents(input.countedCash) - cents(input.expectedCash)) / 100,
    stockDelta: stockDelta / 100,
  };
}
