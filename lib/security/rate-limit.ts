export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
};

export type RateLimitInput = {
  bucket: string;
  key: string;
  windowMs: number;
  max: number;
  now?: number;
};

export interface RateLimitStore {
  increment(input: RateLimitInput): Promise<{ count: number; resetAt: number }>;
  reset?(): void;
}

class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();

  async increment(input: RateLimitInput) {
    const now = input.now ?? Date.now();
    const storeKey = `${input.bucket}:${input.key}`;
    const current = this.entries.get(storeKey);

    if (!current || current.resetAt <= now) {
      const resetAt = now + input.windowMs;
      this.entries.set(storeKey, { count: 1, resetAt });
      return { count: 1, resetAt };
    }

    current.count += 1;
    return { count: current.count, resetAt: current.resetAt };
  }

  reset() {
    this.entries.clear();
  }
}

class PrismaRateLimitStore implements RateLimitStore {
  async increment(input: RateLimitInput) {
    const { prisma } = await import("@/lib/prisma");
    const now = input.now ?? Date.now();
    const nowDate = new Date(now);
    const nextResetDate = new Date(now + input.windowMs);
    const rows = await prisma.$queryRaw<
      Array<{ count: number; reset_at: Date }>
    >`
      INSERT INTO "public"."rate_limit_counter" AS current_counter ("key", "bucket", "count", "reset_at", "updated_at")
      VALUES (${input.key}, ${input.bucket}, 1, ${nextResetDate}, ${nowDate})
      ON CONFLICT ("key") DO UPDATE SET
        "bucket" = EXCLUDED."bucket",
        "count" = CASE
          WHEN current_counter."reset_at" <= ${nowDate} THEN 1
          ELSE current_counter."count" + 1
        END,
        "reset_at" = CASE
          WHEN current_counter."reset_at" <= ${nowDate} THEN ${nextResetDate}
          ELSE current_counter."reset_at"
        END,
        "updated_at" = ${nowDate}
      RETURNING "count", "reset_at";
    `;
    const row = rows[0];

    if (!row) {
      throw new Error("Rate limit counter update failed.");
    }

    return { count: row.count, resetAt: row.reset_at.getTime() };
  }
}

const globalRateLimitStore = globalThis as typeof globalThis & {
  __posardRateLimitStore?: RateLimitStore;
};

export const memoryRateLimitStore =
  globalRateLimitStore.__posardRateLimitStore ?? new MemoryRateLimitStore();
globalRateLimitStore.__posardRateLimitStore = memoryRateLimitStore;

const prismaRateLimitStore = new PrismaRateLimitStore();

let activeStore: RateLimitStore =
  process.env.NODE_ENV === "production" ? prismaRateLimitStore : memoryRateLimitStore;

export function setRateLimitStoreForTesting(store: RateLimitStore) {
  activeStore = store;
}

export function resetRateLimitStoreForTesting() {
  activeStore = memoryRateLimitStore;
  activeStore.reset?.();
}

export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = input.now ?? Date.now();
  const { count, resetAt } = await activeStore.increment(input);
  const retryAfterSec = Math.max(0, Math.ceil((resetAt - now) / 1000));

  return {
    allowed: count <= input.max,
    remaining: Math.max(0, input.max - count),
    resetAt,
    retryAfterSec,
  };
}
