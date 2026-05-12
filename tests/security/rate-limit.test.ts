import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkRateLimit,
  resetRateLimitStoreForTesting,
} from "@/lib/security/rate-limit";
import { clampPagination } from "@/lib/validators/pagination";

test("rate limiter blocks after threshold and separates keys", async () => {
  resetRateLimitStoreForTesting();
  const base = { bucket: "login", windowMs: 60_000, max: 2, now: 1_000 };

  assert.equal((await checkRateLimit({ ...base, key: "a" })).allowed, true);
  assert.equal((await checkRateLimit({ ...base, key: "a" })).allowed, true);
  const blocked = await checkRateLimit({ ...base, key: "a" });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSec, 60);

  assert.equal((await checkRateLimit({ ...base, key: "b" })).allowed, true);
});

test("rate limiter resets after the window", async () => {
  resetRateLimitStoreForTesting();
  const base = { bucket: "signup", windowMs: 100, max: 1 };

  assert.equal((await checkRateLimit({ ...base, key: "ip", now: 1_000 })).allowed, true);
  assert.equal((await checkRateLimit({ ...base, key: "ip", now: 1_050 })).allowed, false);
  assert.equal((await checkRateLimit({ ...base, key: "ip", now: 1_101 })).allowed, true);
});

test("pagination clamps invalid large limits", () => {
  assert.throws(() => clampPagination({ page: 1, limit: 10_000 }));
  assert.deepEqual(clampPagination({ page: "2", limit: "25" }), {
    page: 2,
    limit: 25,
  });
});
