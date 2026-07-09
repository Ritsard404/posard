import assert from "node:assert/strict";
import {
  buildIdleCustomerDisplayDTO,
  sanitizeCustomerDisplayDTO,
} from "@/app/(protected)/pos/_services/_dto/customer-display.dto";

const terminalId = "terminal-a";

const idle = buildIdleCustomerDisplayDTO(terminalId);
assert.equal(idle.status, "idle");
assert.equal(idle.items.length, 0);
assert.equal(idle.totalDue, 0);
assert.equal(idle.paymentMethod, null);

const sanitized = sanitizeCustomerDisplayDTO(
  {
    terminalId: "wrong-terminal",
    status: "completed",
    items: [
      { name: " Burger ", qty: 2, unitPrice: 50, lineTotal: 100 },
      { name: "Voided", qty: 0, unitPrice: 20, lineTotal: 0 },
    ],
    subtotal: 120.129,
    discountTotal: 20.129,
    taxTotal: 10.555,
    totalDue: 100,
    paymentMethod: " Cash ",
    paymentDetails: {
      methodName: " Maya ",
      qrImageUrl: " companies/company-a/payment-qr/maya/qr.webp ",
      accountHolder: " Store Owner ",
      accountNumber: " 09171234567 ",
      providerName: " Maya ",
      instructions: " Pay exact amount only. ",
      internalNote: "must-not-survive",
    },
    cashReceived: 200,
    change: 100,
    message: " Thanks ",
    invoiceId: "must-not-survive",
    cashier: { name: "must-not-survive" },
    margin: 999,
  },
  terminalId,
);

assert.equal(sanitized.terminalId, terminalId);
assert.equal(sanitized.status, "completed");
assert.deepEqual(sanitized.items, [
  { name: "Burger", qty: 2, unitPrice: 50, lineTotal: 100 },
]);
assert.equal(sanitized.subtotal, 120.13);
assert.equal(sanitized.discountTotal, 20.13);
assert.equal(sanitized.taxTotal, 10.56);
assert.equal(sanitized.totalDue, 100);
assert.equal(sanitized.paymentMethod, "Cash");
assert.deepEqual(sanitized.paymentDetails, {
  methodName: "Maya",
  qrImageUrl: "companies/company-a/payment-qr/maya/qr.webp",
  accountHolder: "Store Owner",
  accountNumber: "09171234567",
  providerName: "Maya",
  instructions: "Pay exact amount only.",
});
assert.equal(sanitized.cashReceived, 200);
assert.equal(sanitized.change, 100);
assert.equal(sanitized.message, "Thanks");
assert.equal("invoiceId" in sanitized, false);
assert.equal("cashier" in sanitized, false);
assert.equal("margin" in sanitized, false);
