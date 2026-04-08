import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  InventoryDto,
  InventoryTransactionRequestDto,
} from "@/app/(protected)/product/_services/_dto/inventory.dto";

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export const inventoryService = {
  /**
   * GET /inventory
   * Returns all inventory transaction records with their product info.
   * Mirrors InventoryQueryRepository.findInventoryDtos()
   */
  async findAll(): Promise<InventoryDto[]> {
    const records = await prisma.inventory.findMany({
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map((i) => ({
      id: i.id,
      quantity: Number(i.quantity),
      type: i.type,
      reference: i.reference,
      productId: i.product.id,
      productName: i.product.name,
    }));
  },

  /**
   * POST /inventory/stock/:productId
   * Simple stock increment — shorthand for an IN transaction.
   * Mirrors InventoryServiceImpl.stockProduct()
   */
  async stockProduct(productId: string, qty: number): Promise<void> {
    if (!qty || qty === 0) {
      throw new Error("Quantity must not be zero.");
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
    });
    if (!product) throw new Error("Product not found.");

    await prisma.product.update({
      where: { id: productId },
      data: {
        quantity: {
          increment: qty,
        },
      },
    });
  },

  /**
   * POST /inventory/transaction
   * Full transaction handler: IN, OUT, ADJUSTMENT.
   * Mirrors InventoryServiceImpl.RecordInventoryTransaction()
   *
   * IN         → adds qty to current stock
   * OUT        → subtracts qty, throws if insufficient stock
   * ADJUSTMENT → sets stock to exact qty value
   */
  async recordTransaction(dto: InventoryTransactionRequestDto): Promise<void> {
    if (!dto.inventoryTransactionType) {
      throw new Error("Inventory transaction type is required.");
    }

    if (!dto.quantity || dto.quantity <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }

    const product = await prisma.product.findFirst({
      where: { id: dto.productId, isDeleted: false },
    });
    if (!product) throw new Error("Product not found.");

    const currentQty = Number(product.quantity ?? 0);
    let newQty: number;

    switch (dto.inventoryTransactionType) {
      case "IN":
        newQty = currentQty + dto.quantity;
        break;

      case "OUT":
        if (currentQty < dto.quantity) {
          throw new Error("Not enough stock.");
        }
        newQty = currentQty - dto.quantity;
        break;

      case "ADJUSTMENT":
        newQty = dto.quantity;
        break;

      default:
        throw new Error("Invalid inventory transaction type.");
    }

    // Run both writes in a transaction — mirrors @Transactional in Java
    await prisma.$transaction([
      prisma.product.update({
        where: { id: dto.productId },
        data: { quantity: newQty },
      }),
      prisma.inventory.create({
        data: {
          productId: dto.productId,
          quantity: dto.quantity,
          type: dto.inventoryTransactionType,
          reference: dto.reference ?? null,
        },
      }),
    ]);
  },
};