import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("invoice idempotency and terminal invoice uniqueness remain enforced", () => {
  const schema = read("prisma/schema.prisma");
  const orderService = read("app/(protected)/pos/_services/order.service.ts");
  const syncRoute = read("app/api/sync/actions/route.ts");

  assert.match(schema, /idempotencyKey\s+String\?\s+@unique\s+@map\("idempotency_key"\)/);
  assert.match(schema, /@@unique\(\[posTerminalId, invoiceNumber\]/);
  assert.match(orderService, /findInvoiceByIdempotencyKey/);
  assert.match(orderService, /idempotencyKey/);
  assert.match(syncRoute, /idempotencyKey/);
});

test("duplicate reference payments are guarded before persistence", () => {
  const schema = read("prisma/schema.prisma");
  const orderService = read("app/(protected)/pos/_services/order.service.ts");

  assert.match(schema, /model EPayment/);
  assert.match(schema, /reference\s+String\s+@unique/);
  assert.match(orderService, /Reference number is required/);
  assert.match(orderService, /One or more reference payment methods are invalid|reference payment/i);
});

test("returns keep invoice, item, manager approval, and stock reversal paths", () => {
  const schema = read("prisma/schema.prisma");
  const orderService = read("app/(protected)/pos/_services/order.service.ts");

  assert.match(schema, /model InvoiceReturn/);
  assert.match(schema, /model InvoiceReturnItem/);
  assert.match(orderService, /async returnInvoice/);
  assert.match(orderService, /resolveReturnApproval/);
  assert.match(orderService, /type:\s*"IN"/);
  assert.match(orderService, /returnedAmount/);
});

test("offline replay preserves local invoice traceability and does not trust offline manager approvals", () => {
  const syncRoute = read("app/api/sync/actions/route.ts");
  const bootstrapRoute = read("app/api/sync/bootstrap/route.ts");

  assert.match(syncRoute, /localInvoiceNo:\s*action\.payload\.invoiceNoLocal/);
  assert.match(syncRoute, /Offline cash withdrawal requires online manager approval review/);
  assert.match(syncRoute, /Offline session close requires online manager approval review/);
  assert.doesNotMatch(bootstrapRoute, /pinVerifier:\s*buildManagerPinVerifier/);
  assert.doesNotMatch(bootstrapRoute, /pin:\s*true/);
  assert.doesNotMatch(read("app/(protected)/pos/_services/_dto/offline.dto.ts"), /pinVerifier/);
});
