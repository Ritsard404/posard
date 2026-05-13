import "server-only";

import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/lib/services/audit-log.service";
import { mutationContextService } from "@/lib/services/mutation-context.service";
import type { Prisma } from "@prisma/client";
import type {
  BarcodeGenerationMode,
  BarcodeGenerationResultDto,
  BarcodeLabelProductDto,
} from "./_dto/product.dto";
import type { ProductBarcodeStatusFilter } from "./product-query";

const BARCODE_BATCH_SIZE = 250;
const BARCODE_PRINT_LIMIT = 1000;

function buildInternalBarcode(productId: string): string {
  return `P${productId.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

function buildProductWhere(input: {
  companyId: string;
  ids?: string[];
  keyword?: string;
  categoryId?: string | null;
  barcodeStatus?: ProductBarcodeStatusFilter;
}): Prisma.ProductWhereInput {
  const andConditions: Prisma.ProductWhereInput[] = [
    { isDeleted: false },
    { OR: [{ companyId: input.companyId }, { companyId: null }] },
  ];

  if (input.ids?.length) {
    andConditions.push({ id: { in: input.ids } });
  }

  if (input.keyword) {
    andConditions.push({
      OR: [
        { name: { contains: input.keyword, mode: "insensitive" } },
        { barcode: { contains: input.keyword, mode: "insensitive" } },
      ],
    });
  }

  if (input.categoryId) {
    andConditions.push({ categoryId: input.categoryId });
  }

  if (input.barcodeStatus === "with") {
    andConditions.push({ barcode: { not: null } });
  }

  if (input.barcodeStatus === "without") {
    andConditions.push({ barcode: null });
  }

  return { AND: andConditions };
}

async function generateUniqueBarcode(
  tx: Prisma.TransactionClient,
  productId: string,
  companyId: string,
) {
  const base = buildInternalBarcode(productId);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await tx.product.findFirst({
      where: {
        barcode: candidate,
        companyId,
        NOT: { id: productId },
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${base}${suffix}`;
    suffix += 1;
  }
}

export const barcodeService = {
  async generateForProducts(input: {
    productIds?: string[];
    keyword?: string;
    categoryId?: string | null;
    barcodeStatus?: ProductBarcodeStatusFilter;
    mode: BarcodeGenerationMode;
  }): Promise<BarcodeGenerationResultDto> {
    const context = await mutationContextService.getContext();
    const where = buildProductWhere({
      companyId: context.companyId,
      ids: input.productIds,
      keyword: input.keyword,
      categoryId: input.categoryId,
      barcodeStatus: input.barcodeStatus,
    });

    let updatedCount = 0;
    let skippedCount = 0;
    let cursor: string | undefined;

    while (true) {
      const products = await prisma.product.findMany({
        where,
        select: { id: true, name: true, barcode: true },
        orderBy: { id: "asc" },
        take: BARCODE_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      if (products.length === 0) {
        break;
      }

      await prisma.$transaction(async (tx) => {
        for (const product of products) {
          if (product.barcode && input.mode !== "replace_existing") {
            skippedCount += 1;
            continue;
          }

          const barcode = await generateUniqueBarcode(tx, product.id, context.companyId);
          await tx.product.update({
            where: { id: product.id },
            data: { barcode },
          });
          updatedCount += 1;
        }

        if (updatedCount > 0) {
          await auditLogService.create(tx, {
            companyId: context.companyId,
            actorProfileId: context.profileId,
            actionType: "PRODUCT_BARCODES_GENERATED",
            changes: `Generated ${updatedCount} product barcodes | Mode ${input.mode}`,
          });
        }
      });

      cursor = products[products.length - 1]?.id;

      if (products.length < BARCODE_BATCH_SIZE) {
        break;
      }
    }

    return { updatedCount, skippedCount };
  },

  async listLabels(input: {
    productIds?: string[];
    keyword?: string;
    categoryId?: string | null;
    barcodeStatus?: ProductBarcodeStatusFilter;
    limit?: number;
  }): Promise<BarcodeLabelProductDto[]> {
    const context = await mutationContextService.getContext();
    const where = buildProductWhere({
      companyId: context.companyId,
      ids: input.productIds,
      keyword: input.keyword,
      categoryId: input.categoryId,
      barcodeStatus: input.barcodeStatus,
    });

    const products = await prisma.product.findMany({
      where: {
        AND: [where, { barcode: { not: null } }],
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        price: true,
        baseUnit: true,
        quantity: true,
        category: { select: { categoryName: true } },
      },
      orderBy: { name: "asc" },
      take: Math.min(input.limit ?? BARCODE_PRINT_LIMIT, BARCODE_PRINT_LIMIT),
    });

    return products
      .filter((product): product is typeof product & { barcode: string } => Boolean(product.barcode))
      .map((product) => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        price: Number(product.price),
        categoryName: product.category?.categoryName ?? null,
        baseUnit: product.baseUnit,
        quantity: product.quantity === null ? 1 : Math.max(1, Number(product.quantity)),
      }));
  },
};
