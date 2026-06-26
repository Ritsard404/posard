import "server-only";
import { prisma } from "@/lib/prisma";
import { ProductDto, ItemType, VatType } from "./_dto/pos.dto";

export const productService = {
  async getProducts(companyId?: string): Promise<ProductDto[]> {
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        isAvailable: true,
        ...(companyId ? { companyId } : {}),
      },
      select: {
        id: true,
        name: true,
        productImageUrl: true,
        barcode: true,
        genericName: true,
        brandName: true,
        shelfLocation: true,
        prescriptionRequired: true,
        reorderPoint: true,
        preferredSupplierId: true,
        preferredSupplier: { select: { name: true } },
        stockLots: {
          where: { quantityOnHand: { gt: 0 } },
          orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }],
          select: {
            expiryDate: true,
            quantityOnHand: true,
            status: true,
          },
        },
        baseUnit: true,
        quantity: true,
        cost: true,
        price: true,
        isAvailable: true,
        trackInventory: true,
        itemType: true,
        vatType: true,
        categoryId: true,
        category: { select: { categoryName: true } },
        isConfigurable: true,
        configurationMode: true,
        modifierGroups: {
          orderBy: { displayOrder: "asc" },
          select: {
            displayOrder: true,
            modifierGroup: {
              select: {
                id: true,
                name: true,
                type: true,
                required: true,
                minSelect: true,
                maxSelect: true,
                displayOrder: true,
                options: {
                  where: { isActive: true },
                  orderBy: { displayOrder: "asc" },
                  select: {
                    id: true,
                    name: true,
                    priceDelta: true,
                    displayOrder: true,
                    isDefault: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc"
      }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const nearExpiryEnd = new Date(todayStart);
    nearExpiryEnd.setDate(nearExpiryEnd.getDate() + 30);

    return products.map(p => {
      const lotSummaries = p.stockLots.map((lot) => ({
        expiryDate: lot.expiryDate,
        quantityOnHand: Number(lot.quantityOnHand),
        isExpired:
          lot.status === "expired" ||
          (lot.expiryDate !== null && lot.expiryDate < todayStart),
        isBlocked: lot.status === "blocked",
      }));
      const totalLotQuantity = lotSummaries.reduce((sum, lot) => sum + lot.quantityOnHand, 0);
      const availableLots = lotSummaries.filter((lot) => !lot.isExpired && !lot.isBlocked);
      const availableLotQuantity = availableLots.reduce((sum, lot) => sum + lot.quantityOnHand, 0);
      const unbatchedQuantity = Math.max(0, Number(p.quantity ?? 0) - totalLotQuantity);
      const nearestExpiryDate =
        availableLots.find((lot) => lot.expiryDate !== null)?.expiryDate ?? null;
      const nearExpiryLotCount = availableLots.filter(
        (lot) =>
          lot.expiryDate !== null &&
          lot.expiryDate >= todayStart &&
          lot.expiryDate <= nearExpiryEnd,
      ).length;
      const expiredLotCount = lotSummaries.filter((lot) => lot.isExpired).length;
      const saleBlockedByExpiry =
        p.trackInventory &&
        lotSummaries.length > 0 &&
        Number(p.quantity ?? 0) > 0 &&
        availableLotQuantity + unbatchedQuantity <= 0;

      return ({
      id: p.id,
      name: p.name,
      productImageUrl: p.productImageUrl,
      barcode: p.barcode,
      genericName: p.genericName,
      brandName: p.brandName,
      shelfLocation: p.shelfLocation,
      prescriptionRequired: p.prescriptionRequired,
      reorderPoint: p.reorderPoint === null ? null : Number(p.reorderPoint),
      preferredSupplierId: p.preferredSupplierId,
      preferredSupplierName: p.preferredSupplier?.name ?? null,
      hasBatchTracking: lotSummaries.length > 0,
      nearestExpiryDate: nearestExpiryDate?.toISOString().slice(0, 10) ?? null,
      nearExpiryLotCount,
      expiredLotCount,
      availableLotQuantity,
      expiryStatus: saleBlockedByExpiry
        ? "expired_only"
        : nearExpiryLotCount > 0
          ? "near_expiry"
          : "none",
      saleBlockedByExpiry,
      baseUnit: p.baseUnit,
      quantity: Number(p.quantity ?? 0),
      cost: Number(p.cost),
      price: Number(p.price),
      isAvailable: p.isAvailable,
      trackInventory: p.trackInventory,
      itemType: p.itemType as ItemType,
      vatType: p.vatType as VatType,
      categoryId: p.categoryId,
      categoryName: p.category?.categoryName ?? null,
      isConfigurable: p.isConfigurable,
      configurationMode: p.configurationMode,
      modifierGroups: p.modifierGroups.map((link) => ({
        id: link.modifierGroup.id,
        name: link.modifierGroup.name,
        type: link.modifierGroup.type,
        required: link.modifierGroup.required,
        minSelect: link.modifierGroup.minSelect,
        maxSelect: link.modifierGroup.maxSelect,
        displayOrder: link.displayOrder || link.modifierGroup.displayOrder,
        options: link.modifierGroup.options.map((option) => ({
          id: option.id,
          name: option.name,
          priceDelta: Number(option.priceDelta),
          displayOrder: option.displayOrder,
          isDefault: option.isDefault,
        })),
      })),
    });
    });
  }
};
