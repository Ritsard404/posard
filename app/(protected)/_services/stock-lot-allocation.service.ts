import "server-only";

import { Prisma } from "@prisma/client";

export interface StockLotAllocation {
  stockLotId: string | null;
  batchNumber: string | null;
  quantity: number;
  unitCost: number;
  lotQuantityBefore: number | null;
  lotQuantityAfter: number | null;
}

function getTodayStart() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return todayStart;
}

function isExpiredStockLot(expiryDate: Date | null, todayStart: Date) {
  return expiryDate !== null && expiryDate < todayStart;
}

export async function allocateStockLotsForStockOut(
  db: Prisma.TransactionClient,
  input: {
    companyId: string;
    productId: string;
    requestedQuantity: number;
    productQuantity: number;
    fallbackUnitCost: number;
  },
): Promise<StockLotAllocation[]> {
  if (input.requestedQuantity <= 0) return [];

  const lots = await db.stockLot.findMany({
    where: {
      companyId: input.companyId,
      productId: input.productId,
      quantityOnHand: { gt: 0 },
    },
    select: {
      id: true,
      batchNumber: true,
      expiryDate: true,
      quantityOnHand: true,
      unitCost: true,
      status: true,
      receivedAt: true,
      createdAt: true,
    },
  });

  if (lots.length === 0) {
    return [
      {
        stockLotId: null,
        batchNumber: null,
        quantity: input.requestedQuantity,
        unitCost: input.fallbackUnitCost,
        lotQuantityBefore: null,
        lotQuantityAfter: null,
      },
    ];
  }

  const todayStart = getTodayStart();
  const totalLotQuantity = lots.reduce(
    (sum, lot) => sum + Number(lot.quantityOnHand),
    0,
  );
  const unbatchedQuantity = Math.max(0, input.productQuantity - totalLotQuantity);
  const availableLots = lots
    .filter(
      (lot) =>
        lot.status === "available" &&
        !isExpiredStockLot(lot.expiryDate, todayStart),
    )
    .sort((a, b) => {
      const aExpiry = a.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const bExpiry = b.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
      if (aExpiry !== bExpiry) return aExpiry - bExpiry;

      return (
        (a.receivedAt ?? a.createdAt).getTime() -
        (b.receivedAt ?? b.createdAt).getTime()
      );
    });
  const availableLotQuantity = availableLots.reduce(
    (sum, lot) => sum + Number(lot.quantityOnHand),
    0,
  );

  if (availableLotQuantity + unbatchedQuantity < input.requestedQuantity) {
    throw new Error(
      "Only expired or unavailable batches remain for this product. Receive a non-expired batch before continuing.",
    );
  }

  let remaining = input.requestedQuantity;
  const allocations: StockLotAllocation[] = [];

  for (const lot of availableLots) {
    if (remaining <= 0) break;

    const before = Number(lot.quantityOnHand);
    const quantity = Math.min(before, remaining);
    const after = before - quantity;

    await db.stockLot.update({
      where: { id: lot.id },
      data: {
        quantityOnHand: new Prisma.Decimal(after),
        status: after <= 0 ? "depleted" : "available",
      },
    });

    allocations.push({
      stockLotId: lot.id,
      batchNumber: lot.batchNumber,
      quantity,
      unitCost: Number(lot.unitCost),
      lotQuantityBefore: before,
      lotQuantityAfter: after,
    });
    remaining -= quantity;
  }

  if (remaining > 0) {
    allocations.push({
      stockLotId: null,
      batchNumber: null,
      quantity: remaining,
      unitCost: input.fallbackUnitCost,
      lotQuantityBefore: null,
      lotQuantityAfter: null,
    });
  }

  return allocations;
}
