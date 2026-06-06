import "server-only";

import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/lib/services/audit-log.service";
import { mutationContextService } from "@/lib/services/mutation-context.service";
import type { InventoryTransactionType } from "@prisma/client";
import type {
  InventoryDto,
  InventoryTransactionRequestDto,
} from "@/app/(protected)/product/_services/_dto/inventory.dto";

function buildInventorySummary(params: {
  productName: string;
  transactionType: InventoryTransactionType;
  previousQuantity: number;
  quantityDelta: number;
  nextQuantity: number;
  reference?: string;
}) {
  const actionLabel =
    params.transactionType === "IN"
      ? "Stock in"
      : params.transactionType === "OUT"
        ? "Stock out"
        : "Stock adjustment";

  return [
    `${actionLabel} for ${params.productName}`,
    `Previous ${params.previousQuantity}`,
    `Change ${params.quantityDelta}`,
    `Current ${params.nextQuantity}`,
    params.reference ? `Reference ${params.reference}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function actionTypeForInventory(transactionType: InventoryTransactionType) {
  switch (transactionType) {
    case "IN":
      return "PRODUCT_STOCK_IN";
    case "OUT":
      return "PRODUCT_STOCK_OUT";
    case "ADJUSTMENT":
      return "PRODUCT_STOCK_ADJUSTMENT";
  }
}

function assertFiniteQuantity(quantity: number, label = "Quantity") {
  if (!Number.isFinite(quantity)) {
    throw new Error(`${label} must be a valid number.`);
  }
}

export const inventoryService = {
  async findAll(): Promise<InventoryDto[]> {
    const records = await prisma.inventory.findMany({
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map((record) => ({
      id: record.id,
      quantity: Number(record.quantity),
      type: record.type,
      reference: record.reference,
      productId: record.product.id,
      productName: record.product.name,
    }));
  },

  async stockProduct(productId: string, qty: number): Promise<void> {
    assertFiniteQuantity(qty);

    if (qty === 0) {
      throw new Error("Quantity must not be zero.");
    }

    const context = await mutationContextService.getContext();

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, isDeleted: false },
      });

      if (!product) {
        throw new Error("Product not found.");
      }

      if (!product.trackInventory) {
        throw new Error("This product does not use inventory tracking.");
      }

      const previousQuantity = Number(product.quantity ?? 0);
      const nextQuantity = previousQuantity + qty;
      if (nextQuantity < 0) {
        throw new Error("Not enough stock.");
      }

      await tx.product.update({
        where: { id: productId },
        data: {
          quantity: nextQuantity,
        },
      });

      await tx.inventory.create({
        data: {
          productId,
          quantity: Math.abs(qty),
          type: qty >= 0 ? "IN" : "OUT",
          reference: "Quick stock adjustment",
        },
      });

      await auditLogService.create(tx, {
        companyId: context.companyId,
        actorProfileId: context.profileId,
        actionType: qty >= 0 ? "PRODUCT_STOCK_IN" : "PRODUCT_STOCK_OUT",
        referenceId: product.id,
        changes: buildInventorySummary({
          productName: product.name,
          transactionType: qty >= 0 ? "IN" : "OUT",
          previousQuantity,
          quantityDelta: qty,
          nextQuantity,
          reference: "Quick stock adjustment",
        }),
      });
    });
  },

  async recordTransaction(dto: InventoryTransactionRequestDto): Promise<void> {
    if (!dto.inventoryTransactionType) {
      throw new Error("Inventory transaction type is required.");
    }

    assertFiniteQuantity(dto.quantity);

    if (dto.quantity <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }

    const context = await mutationContextService.getContext();

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: dto.productId, isDeleted: false },
      });

      if (!product) {
        throw new Error("Product not found.");
      }

      if (!product.trackInventory) {
        throw new Error("This product does not use inventory tracking.");
      }

      const currentQty = Number(product.quantity ?? 0);
      let nextQuantity = currentQty;
      let quantityDelta = dto.quantity;

      switch (dto.inventoryTransactionType) {
        case "IN":
          nextQuantity = currentQty + dto.quantity;
          break;
        case "OUT":
          if (currentQty < dto.quantity) {
            throw new Error("Not enough stock.");
          }
          nextQuantity = currentQty - dto.quantity;
          quantityDelta = -dto.quantity;
          break;
        case "ADJUSTMENT":
          nextQuantity = dto.quantity;
          quantityDelta = dto.quantity - currentQty;
          break;
      }

      if (nextQuantity < 0) {
        throw new Error("Inventory movement cannot make stock negative.");
      }

      await tx.product.update({
        where: { id: dto.productId },
        data: { quantity: nextQuantity },
      });

      await tx.inventory.create({
        data: {
          productId: dto.productId,
          quantity: dto.quantity,
          type: dto.inventoryTransactionType,
          reference: dto.reference ?? null,
        },
      });

      await auditLogService.create(tx, {
        companyId: context.companyId,
        actorProfileId: context.profileId,
        actionType: actionTypeForInventory(dto.inventoryTransactionType),
        referenceId: product.id,
        changes: buildInventorySummary({
          productName: product.name,
          transactionType: dto.inventoryTransactionType,
          previousQuantity: currentQty,
          quantityDelta,
          nextQuantity,
          reference: dto.reference,
        }),
      });
    });
  },
};
