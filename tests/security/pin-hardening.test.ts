import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { checkRateLimit, resetRateLimitStoreForTesting } from "@/lib/security/rate-limit";
import { hashPin, isHashedPin, verifyPin } from "@/lib/security/pin";

test("manager PIN hashes do not store the raw PIN and still verify", () => {
  const hashed = hashPin("1234");

  assert.equal(isHashedPin(hashed), true);
  assert.equal(hashed.includes("1234"), false);
  assert.equal(verifyPin("1234", hashed), true);
  assert.equal(verifyPin("9999", hashed), false);
});

test("legacy plain PIN verification is supported for one-time upgrade compatibility", () => {
  assert.equal(isHashedPin("1234"), false);
  assert.equal(verifyPin("1234", "1234"), true);
  assert.equal(verifyPin("9999", "1234"), false);
});

test("SQL-migrated sha256 PIN hashes verify without exposing plain text", () => {
  const salt = "abc123";
  const stored = `sha256$${salt}$${createHash("sha256").update(`1234${salt}`).digest("hex")}`;

  assert.equal(stored.includes("$1234$"), false);
  assert.equal(verifyPin("1234", stored), true);
  assert.equal(verifyPin("0000", stored), false);
});

test("manager PIN rate limit bucket locks repeated attempts", async () => {
  resetRateLimitStoreForTesting();
  const base = {
    bucket: "managerPin",
    key: "company-a:profile-a",
    windowMs: 300_000,
    max: 2,
    now: 1_000,
  };

  assert.equal((await checkRateLimit(base)).allowed, true);
  assert.equal((await checkRateLimit(base)).allowed, true);
  assert.equal((await checkRateLimit(base)).allowed, false);
});
