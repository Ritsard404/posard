import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { calculatePayment } from "../../app/(protected)/pos/_services/payment-calculation.service";
import { moneyEquals, sumMoney } from "../fixtures/test-helpers";

const item = (
  subTotal: number,
  vatType: "VATABLE" | "EXEMPT" | "ZERO" = "VATABLE",
) => ({ productId: `${vatType}-${subTotal}`, subTotal, vatType });

describe("POS payment calculations", () => {
  test("separates VAT from a tax-inclusive exact cash sale", () => {
    assert.deepEqual(
      calculatePayment({
        items: [item(112)],
        vatRate: 12,
        cashTenderAmount: 112,
      }),
      {
        grossAmount: 112,
        totalAmount: 112,
        subTotal: 100,
        discountAmount: 0,
        vatableTotal: 112,
        vatSales: 100,
        vatAmount: 12,
        vatExempt: 0,
        vatZero: 0,
        cashTendered: 112,
        totalTendered: 112,
        changeAmount: 0,
        dueAmount: 112,
      },
    );
  });

  test("reports overpayment as change and preserves an under-tendered amount", () => {
    const over = calculatePayment({
      items: [item(25)],
      vatRate: 12,
      cashTenderAmount: 100,
    });
    assert.equal(over.totalTendered, 100);
    assert.equal(over.changeAmount, 75);

    const under = calculatePayment({
      items: [item(25)],
      vatRate: 12,
      cashTenderAmount: 10,
    });
    assert.equal(under.totalTendered, 10);
    assert.equal(under.changeAmount, 0);
    assert.equal(under.totalAmount - under.totalTendered, 15);
  });

  test("caps e-payment at the balance in a split tender", () => {
    const result = calculatePayment({
      items: [item(100)],
      vatRate: 12,
      cashTenderAmount: 40,
      ePayments: [{ amount: 80 }],
    });

    assert.equal(result.totalTendered, 100);
    assert.equal(result.changeAmount, 0);
  });

  test("applies percentage and amount discount caps", () => {
    const percentageCap = calculatePayment({
      items: [item(200)],
      vatRate: 12,
      discount: { discountPercent: 30 },
      discountCapType: "percent",
      discountCapValue: 10,
    });
    assert.equal(percentageCap.discountAmount, 20);
    assert.equal(percentageCap.totalAmount, 180);

    const amountCap = calculatePayment({
      items: [item(200)],
      vatRate: 12,
      discount: { discountAmount: 75 },
      discountCapType: "amount",
      discountCapValue: 25,
    });
    assert.equal(amountCap.discountAmount, 25);
    assert.equal(amountCap.totalAmount, 175);
  });

  test("converts VATable sales and mixed tax classes for statutory discounts", () => {
    const result = calculatePayment({
      items: [item(112), item(50, "EXEMPT"), item(25, "ZERO")],
      vatRate: 12,
      discount: {
        discountType: "SENIOR",
        eligibleDiscName: "Test Customer",
        oscaIdNum: "E2E-OSCA-1",
      },
    });

    assert.equal(result.grossAmount, 187);
    assert.equal(result.discountAmount, 47);
    assert.equal(result.totalAmount, 140);
    assert.equal(result.vatableTotal, 0);
    assert.equal(result.vatAmount, 0);
    assert.equal(result.vatExempt, 150);
    assert.equal(result.vatZero, 25);
  });

  test("never allows a discount to make the total negative", () => {
    const result = calculatePayment({
      items: [item(10, "EXEMPT")],
      vatRate: 12,
      discount: { discountAmount: 999 },
    });

    assert.equal(result.discountAmount, 10);
    assert.equal(result.totalAmount, 0);
    assert.equal(result.changeAmount, 0);
  });

  test("reconciles totals with decimal-safe money helpers", () => {
    const result = calculatePayment({
      items: [item(10.1, "EXEMPT"), item(0.2, "EXEMPT")],
      vatRate: 12,
      cashTenderAmount: 10.3,
    });

    moneyEquals(result.totalAmount, sumMoney(10.1, 0.2));
    moneyEquals(result.totalTendered, result.totalAmount);
  });
});
