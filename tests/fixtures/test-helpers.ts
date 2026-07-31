import assert from 'node:assert/strict';

/** Convert a decimal amount to integer cents without binary floating-point drift. */
export function cents(amount: number): number {
  assert(Number.isFinite(amount), 'Money amount must be finite.');
  return Math.round((amount + Number.EPSILON) * 100);
}

export function moneyEquals(actual: number, expected: number, message?: string) {
  assert.equal(cents(actual), cents(expected), message);
}

export function sumMoney(...amounts: number[]): number {
  return amounts.reduce((total, amount) => total + cents(amount), 0) / 100;
}

export function uniqueTestId(prefix = 'E2E'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
