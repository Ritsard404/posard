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

const globalRateLimitStore = globalThis as typeof globalThis & {
  __posardRateLimitStore?: RateLimitStore;
};

export const memoryRateLimitStore =
  globalRateLimitStore.__posardRateLimitStore ?? new MemoryRateLimitStore();
globalRateLimitStore.__posardRateLimitStore = memoryRateLimitStore;

let activeStore: RateLimitStore = memoryRateLimitStore;

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
