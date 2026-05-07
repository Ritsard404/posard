"use client";

import { posOfflineDb } from "./offline-db.client";

const POOL_ID = "official-invoice";
const POOL_SIZE = 50;
const REFILL_THRESHOLD = 10;

let refillInFlight: Promise<void> | null = null;

async function reserveInvoiceNumbers(count = POOL_SIZE) {
  const response = await fetch(`/api/invoices/reserve?count=${count}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  const payload = (await response.json()) as
    | { success: true; data: { from: number; to: number } }
    | { success: false; error: string };

  if (!payload.success) {
    throw new Error(payload.error || "Unable to reserve invoice numbers.");
  }

  return payload.data;
}

export async function refillInvoicePool() {
  if (refillInFlight) {
    return refillInFlight;
  }

  refillInFlight = (async () => {
    const current = await posOfflineDb.invoicePool.get(POOL_ID);

    if (current && current.nextAvailable <= current.poolEnd) {
      return;
    }

    const range = await reserveInvoiceNumbers();
    await posOfflineDb.invoicePool.put({
      id: POOL_ID,
      nextAvailable: range.from,
      poolEnd: range.to,
      updatedAt: new Date().toISOString(),
    });
  })().finally(() => {
    refillInFlight = null;
  });

  return refillInFlight;
}

export async function reserveNextInvoiceNumber() {
  return reserveNextInvoiceNumberFromPool({ allowNetworkRefill: true });
}

export async function reserveNextLocalInvoiceNumber() {
  return reserveNextInvoiceNumberFromPool({ allowNetworkRefill: false });
}

async function reserveNextInvoiceNumberFromPool(options: {
  allowNetworkRefill: boolean;
}) {
  let reserved: number | null = null;

  while (reserved === null) {
    const current = await posOfflineDb.invoicePool.get(POOL_ID);

    if (!current || current.nextAvailable > current.poolEnd) {
      if (!options.allowNetworkRefill) {
        throw new Error(
          "Official invoice numbers are still preparing. Please wait a moment and try again.",
        );
      }

      const range = await reserveInvoiceNumbers();
      let insertedRange = false;

      await posOfflineDb.transaction("rw", posOfflineDb.invoicePool, async () => {
        const latest = await posOfflineDb.invoicePool.get(POOL_ID);

        if (latest && latest.nextAvailable <= latest.poolEnd) {
          return;
        }

        await posOfflineDb.invoicePool.put({
          id: POOL_ID,
          nextAvailable: range.from + 1,
          poolEnd: range.to,
          updatedAt: new Date().toISOString(),
        });
        insertedRange = true;
      });

      if (insertedRange) {
        reserved = range.from;
        break;
      }

      continue;
    }

    await posOfflineDb.transaction("rw", posOfflineDb.invoicePool, async () => {
      const pool = await posOfflineDb.invoicePool.get(POOL_ID);

      if (!pool || pool.nextAvailable > pool.poolEnd) {
        return;
      }

      reserved = pool.nextAvailable;
      await posOfflineDb.invoicePool.update(POOL_ID, {
        nextAvailable: pool.nextAvailable + 1,
        updatedAt: new Date().toISOString(),
      });

      if (pool.poolEnd - pool.nextAvailable <= REFILL_THRESHOLD) {
        void refillInvoicePool().catch(() => undefined);
      }
    });
  }

  if (!reserved) {
    throw new Error("Unable to reserve an invoice number.");
  }

  return reserved;
}
