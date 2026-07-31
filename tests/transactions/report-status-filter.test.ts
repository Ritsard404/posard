import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("transaction reports expose a bounded status filter", () => {
  const service = read("app/(protected)/report/_services/report.service.ts");
  const page = read("app/(protected)/reports/_services/report-page.service.ts");
  const toolbar = read("app/(protected)/reports/_components/ReportFilterToolbar.tsx");
  const pagination = read("app/(protected)/report/_components/ReportPaginationBar.tsx");

  assert.match(service, /status\?: "PAID" \| "VOID" \| "RETURNED" \| "CANCELLED"/);
  assert.match(service, /status: input\.status \? input\.status : \{ not: "PENDING"/);
  assert.match(service, /branchId: input\.branchId/);
  assert.match(service, /cashierId: input\.cashierId/);
  assert.match(page, /\["PAID", "VOID", "RETURNED", "CANCELLED"\]/);
  assert.match(toolbar, /aria-label="Transaction status"/);
  assert.match(toolbar, /aria-label="Report branch"/);
  assert.match(toolbar, /aria-label="Report cashier"/);
  assert.match(toolbar, /All statuses/);
  assert.match(pagination, /status\?: "PAID" \| "VOID" \| "RETURNED" \| "CANCELLED"/);
  assert.match(pagination, /params\.set\("status", input\.status\)/);
  assert.match(pagination, /params\.set\("branchId", input\.branchId\)/);
  assert.match(pagination, /params\.set\("cashierId", input\.cashierId\)/);
});
