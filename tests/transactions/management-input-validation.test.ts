import assert from "node:assert/strict";
import { test } from "node:test";

import {
  expenseCreateSchema,
  promotionCreateSchema,
  stockAdjustmentSchema,
  supplierUpsertSchema,
} from "../../app/(protected)/_services/management-workflow.schemas";

const uuid = "00000000-0000-4000-8000-000000000001";

test("management workflows reject negative, oversized, and script-like input", () => {
  assert.equal(
    stockAdjustmentSchema.safeParse({
      productId: uuid,
      direction: "decrease",
      quantity: -1,
      reason: "test",
    }).success,
    false,
  );
  assert.equal(
    expenseCreateSchema.safeParse({
      categoryId: uuid,
      expenseDate: "2026-07-28",
      amount: 0,
    }).success,
    false,
  );
  assert.equal(
    supplierUpsertSchema.safeParse({
      name: `<script>alert("x")</script>`,
    }).success,
    false,
  );
  assert.equal(
    promotionCreateSchema.safeParse({
      name: "x".repeat(161),
      promotionType: "percentage",
      value: 10,
    }).success,
    false,
  );
});
