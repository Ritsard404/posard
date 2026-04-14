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
        baseUnit: true,
        quantity: true,
        cost: true,
        price: true,
        isAvailable: true,
        trackInventory: true,
        itemType: true,
        vatType: true,
        categoryId: true,
      },
      orderBy: {
        name: "asc"
      }
    });

    return products.map(p => ({
      id: p.id,
      name: p.name,
      productImageUrl: p.productImageUrl,
      barcode: p.barcode,
      baseUnit: p.baseUnit,
      quantity: Number(p.quantity ?? 0),
      cost: Number(p.cost),
      price: Number(p.price),
      isAvailable: p.isAvailable,
      trackInventory: p.trackInventory,
      itemType: p.itemType as ItemType,
      vatType: p.vatType as VatType,
      categoryId: p.categoryId,
    }));
  }
};
