import "server-only";

import Papa from "papaparse";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { auditLogService } from "@/lib/services/audit-log.service";
import { mutationContextService } from "@/lib/services/mutation-context.service";
import type { Prisma, ItemType, VatType } from "@prisma/client";
import type {
  ProductBatchPreviewDto,
  ProductBatchPreviewRowDto,
  ProductBatchRowDto,
  ProductDto,
  ProductSaveDto,
  PageResponse,
} from "@/app/(protected)/product/_services/_dto/product.dto";

type ProductWithCategory = Prisma.ProductGetPayload<{ include: { category: true } }>;
type DbClient = typeof prisma | Prisma.TransactionClient;

const SORTABLE_FIELDS: Record<string, keyof Prisma.ProductOrderByWithRelationInput> = {
  name: "name",
  price: "price",
  cost: "cost",
  quantity: "quantity",
  createdAt: "createdAt",
};

const ITEM_TYPES = new Set<ItemType>(["RESALE", "WHOLESALE"]);
const VAT_TYPES = new Set<VatType>(["VATABLE", "EXEMPT", "ZERO"]);
const CSV_HEADERS = [
  "Product Name",
  "Category Name",
  "Barcode",
  "Base Unit",
  "Track Inventory",
  "Quantity",
  "Cost",
  "Price",
  "Item Type",
  "VAT Type",
  "Available",
  "Product Image URL",
] as const;

type CsvRow = Record<string, string | undefined>;

interface NormalizedProductInput {
  name: string;
  categoryName: string;
  barcode: string | null;
  baseUnit: string;
  quantity: number | null;
  cost: number;
  price: number;
  isAvailable: boolean;
  trackInventory: boolean;
  itemType: ItemType;
  vatType: VatType;
  productImageUrl: string | null;
}

async function getCompanyId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const profile = await prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: { companyId: true },
  });

  return profile?.companyId ?? null;
}

function toProductDto(product: ProductWithCategory): ProductDto {
  return {
    id: product.id,
    name: product.name,
    productImageUrl: product.productImageUrl,
    barcode: product.barcode,
    baseUnit: product.baseUnit,
    quantity: product.quantity === null ? null : Number(product.quantity),
    cost: Number(product.cost),
    price: Number(product.price),
    isAvailable: product.isAvailable,
    trackInventory: product.trackInventory,
    itemType: product.itemType,
    vatType: product.vatType,
    categoryId: product.categoryId,
    categoryName: product.category?.categoryName ?? null,
  };
}

function asOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalNumber(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBooleanValue(value?: string | boolean | null, fallback = false): boolean {
  if (typeof value === "boolean") return value;

  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;

  return ["true", "1", "yes", "y"].includes(normalized);
}

function normalizeCategoryName(value?: string): string {
  return (value?.trim() || "Uncategorized").toUpperCase();
}

function normalizeProductInput(dto: ProductSaveDto): NormalizedProductInput {
  const name = dto.name.trim();
  if (!name) {
    throw new Error("Product name is required.");
  }

  const price = parseOptionalNumber(dto.price);
  if (price === null || price < 0) {
    throw new Error("Price must be a valid positive number.");
  }

  const cost = parseOptionalNumber(dto.cost) ?? 0;
  if (cost < 0) {
    throw new Error("Cost must be zero or greater.");
  }

  const trackInventory = dto.trackInventory ?? false;
  const parsedQuantity = parseOptionalNumber(dto.quantity);
  const quantity = trackInventory ? parsedQuantity ?? 0 : null;

  if (quantity !== null && quantity < 0) {
    throw new Error("Quantity must be zero or greater.");
  }

  const itemType = dto.itemType ?? "RESALE";
  if (!ITEM_TYPES.has(itemType)) {
    throw new Error("Item type is invalid.");
  }

  const vatType = dto.vatType ?? "VATABLE";
  if (!VAT_TYPES.has(vatType)) {
    throw new Error("VAT type is invalid.");
  }

  return {
    name,
    categoryName: normalizeCategoryName(dto.categoryName),
    barcode: asOptionalString(dto.barcode),
    baseUnit: dto.baseUnit?.trim() || "UNIT",
    quantity,
    cost,
    price,
    isAvailable: dto.isAvailable ?? true,
    trackInventory,
    itemType,
    vatType,
    productImageUrl: asOptionalString(dto.productImageUrl),
  };
}

function createFieldChange(label: string, before: string, after: string): string | null {
  return before === after ? null : `${label}: ${before} -> ${after}`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function buildCreateSummary(input: NormalizedProductInput, categoryName: string): string {
  return [
    `Created ${input.name}`,
    `Category ${categoryName}`,
    `Price ${input.price.toFixed(2)}`,
    `Track inventory ${input.trackInventory ? "Yes" : "No"}`,
    input.quantity === null ? "Quantity not tracked" : `Quantity ${input.quantity}`,
    `VAT ${input.vatType}`,
  ].join(" | ");
}

function buildDeleteSummary(product: ProductWithCategory): string {
  return [
    `Deleted ${product.name}`,
    `Category ${product.category?.categoryName ?? "Uncategorized"}`,
    `Price ${Number(product.price).toFixed(2)}`,
    product.quantity === null ? "Quantity not tracked" : `Quantity ${Number(product.quantity)}`,
  ].join(" | ");
}

function buildUpdateSummary(
  existing: ProductWithCategory,
  categoryName: string,
  next: NormalizedProductInput,
): string {
  const fields = [
    createFieldChange("Name", existing.name, next.name),
    createFieldChange("Category", existing.category?.categoryName ?? "Uncategorized", categoryName),
    createFieldChange("Barcode", formatValue(existing.barcode), formatValue(next.barcode)),
    createFieldChange("Base unit", existing.baseUnit, next.baseUnit),
    createFieldChange("Quantity", formatValue(existing.quantity === null ? null : Number(existing.quantity)), formatValue(next.quantity)),
    createFieldChange("Cost", Number(existing.cost).toFixed(2), next.cost.toFixed(2)),
    createFieldChange("Price", Number(existing.price).toFixed(2), next.price.toFixed(2)),
    createFieldChange("Available", formatValue(existing.isAvailable), formatValue(next.isAvailable)),
    createFieldChange("Track inventory", formatValue(existing.trackInventory), formatValue(next.trackInventory)),
    createFieldChange("Item type", existing.itemType, next.itemType),
    createFieldChange("VAT type", existing.vatType, next.vatType),
    createFieldChange("Image URL", formatValue(existing.productImageUrl), formatValue(next.productImageUrl)),
  ].filter(Boolean);

  return fields.length > 0 ? fields.join(" | ") : `Updated ${existing.name} with no field changes`;
}

function toBatchRow(dto: ProductSaveDto, rowNumber: number): ProductBatchRowDto {
  const normalized = normalizeProductInput(dto);

  return {
    rowNumber,
    name: normalized.name,
    categoryName: normalized.categoryName,
    barcode: normalized.barcode,
    baseUnit: normalized.baseUnit,
    trackInventory: normalized.trackInventory,
    quantity: normalized.quantity,
    cost: normalized.cost,
    price: normalized.price,
    itemType: normalized.itemType,
    vatType: normalized.vatType,
    isAvailable: normalized.isAvailable,
    productImageUrl: normalized.productImageUrl,
  };
}

function makeDuplicateKey(name: string, categoryName: string): string {
  return `${name.trim().toUpperCase()}::${normalizeCategoryName(categoryName)}`;
}

function parseCsvRow(rawRow: CsvRow, rowNumber: number): ProductBatchPreviewRowDto {
  const errors: string[] = [];

  const itemType = (rawRow["item type"]?.trim().toUpperCase() || "RESALE") as ItemType;
  if (!ITEM_TYPES.has(itemType)) {
    errors.push("Item Type must be RESALE or WHOLESALE.");
  }

  const vatType = (rawRow["vat type"]?.trim().toUpperCase() || "VATABLE") as VatType;
  if (!VAT_TYPES.has(vatType)) {
    errors.push("VAT Type must be VATABLE, EXEMPT, or ZERO.");
  }

  const trackInventory = parseBooleanValue(rawRow["track inventory"], false);
  const quantityValue = parseOptionalNumber(rawRow["quantity"]);
  const costValue = parseOptionalNumber(rawRow["cost"]);
  const priceValue = parseOptionalNumber(rawRow["price"]);

  const name = rawRow["product name"]?.trim() || "";
  if (!name) {
    errors.push("Product Name is required.");
  }

  if (priceValue === null || priceValue < 0) {
    errors.push("Price must be zero or greater.");
  }

  if (costValue !== null && costValue < 0) {
    errors.push("Cost must be zero or greater.");
  }

  if (trackInventory && quantityValue !== null && quantityValue < 0) {
    errors.push("Quantity must be zero or greater.");
  }

  const row: ProductBatchPreviewRowDto = {
    rowNumber,
    name,
    categoryName: normalizeCategoryName(rawRow["category name"]),
    barcode: asOptionalString(rawRow["barcode"]),
    baseUnit: rawRow["base unit"]?.trim() || "UNIT",
    trackInventory,
    quantity: trackInventory ? quantityValue ?? 0 : null,
    cost: costValue ?? 0,
    price: priceValue ?? 0,
    itemType: ITEM_TYPES.has(itemType) ? itemType : "RESALE",
    vatType: VAT_TYPES.has(vatType) ? vatType : "VATABLE",
    isAvailable: parseBooleanValue(rawRow["available"], true),
    productImageUrl: asOptionalString(rawRow["product image url"]),
    errors,
  };

  return row;
}

async function resolveCategory(
  client: DbClient,
  params: { categoryId?: string; categoryName?: string; companyId: string },
): Promise<{ id: string; categoryName: string }> {
  const { categoryId, categoryName, companyId } = params;

  if (categoryId) {
    const byId = await client.category.findFirst({
      where: { id: categoryId, companyId, isDeleted: false },
      select: { id: true, categoryName: true },
    });

    if (byId) {
      return {
        id: byId.id,
        categoryName: byId.categoryName ?? "Uncategorized",
      };
    }
  }

  const normalizedName = normalizeCategoryName(categoryName);
  const byName = await client.category.findFirst({
    where: {
      categoryName: { equals: normalizedName, mode: "insensitive" },
      companyId,
      isDeleted: false,
    },
    select: { id: true, categoryName: true },
  });

  if (byName) {
    return {
      id: byName.id,
      categoryName: byName.categoryName ?? normalizedName,
    };
  }

  const created = await client.category.create({
    data: {
      categoryName: normalizedName,
      companyId,
    },
    select: { id: true, categoryName: true },
  });

  return {
    id: created.id,
    categoryName: created.categoryName ?? normalizedName,
  };
}

async function ensureUniqueProduct(
  client: DbClient,
  productId: string | null,
  name: string,
  categoryId: string,
): Promise<void> {
  const duplicate = await client.product.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      categoryId,
      isDeleted: false,
      ...(productId ? { NOT: { id: productId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new Error("Product name already exists in this category.");
  }
}

export const productService = {
  async findAll(params?: {
    keyword?: string;
    barcode?: string;
    categoryId?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: "asc" | "desc";
  }): Promise<PageResponse<ProductDto>> {
    const companyId = await getCompanyId();
    const page = params?.page ?? 0;
    const size = params?.size ?? 10;
    const sortField = SORTABLE_FIELDS[params?.sortBy ?? ""] ?? "name";
    const direction = params?.direction === "desc" ? "desc" : "asc";

    const andConditions: Prisma.ProductWhereInput[] = [];

    if (params?.keyword) {
      andConditions.push({
        OR: [
          { name: { contains: params.keyword, mode: "insensitive" } },
          { barcode: { contains: params.keyword, mode: "insensitive" } },
        ],
      });
    }

    if (companyId) {
      andConditions.push({
        OR: [{ companyId }, { companyId: null }],
      });
    }

    const where: Prisma.ProductWhereInput = {
      isDeleted: false,
      ...(params?.barcode ? { barcode: params.barcode } : {}),
      ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };

    const [products, totalElements] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        skip: page * size,
        take: size,
        orderBy: { [sortField]: direction },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalElements / size);

    return {
      content: products.map(toProductDto),
      page,
      size,
      totalElements,
      totalPages,
      hasNext: page + 1 < totalPages,
      hasPrevious: page > 0,
    };
  },

  async findById(id: string): Promise<ProductDto | null> {
    const product = await prisma.product.findFirst({
      where: { id, isDeleted: false },
      include: { category: true },
    });

    return product ? toProductDto(product) : null;
  },

  async findByCategory(params: {
    categoryId: string;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: "asc" | "desc";
  }): Promise<ProductDto[]> {
    const companyId = await getCompanyId();
    const page = params?.page ?? 0;
    const size = params?.size ?? 10;
    const sortField = SORTABLE_FIELDS[params?.sortBy ?? ""] ?? "name";
    const direction = params?.direction === "desc" ? "desc" : "asc";

    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        isAvailable: true,
        categoryId: params.categoryId,
        ...(companyId ? { OR: [{ companyId }, { companyId: null }] } : {}),
      },
      include: { category: true },
      skip: page * size,
      take: size,
      orderBy: { [sortField]: direction },
    });

    return products.map(toProductDto);
  },

  async create(dto: ProductSaveDto): Promise<void> {
    const context = await mutationContextService.getContext();
    const normalized = normalizeProductInput(dto);

    await prisma.$transaction(async (tx) => {
      const category = await resolveCategory(tx, {
        categoryId: dto.categoryId,
        categoryName: dto.categoryName ?? normalized.categoryName,
        companyId: context.companyId,
      });

      await ensureUniqueProduct(tx, null, normalized.name, category.id);

      const created = await tx.product.create({
        data: {
          name: normalized.name,
          barcode: normalized.barcode,
          baseUnit: normalized.baseUnit,
          quantity: normalized.quantity,
          cost: normalized.cost,
          price: normalized.price,
          isAvailable: normalized.isAvailable,
          trackInventory: normalized.trackInventory,
          itemType: normalized.itemType,
          vatType: normalized.vatType,
          productImageUrl: normalized.productImageUrl,
          categoryId: category.id,
          companyId: context.companyId,
        },
      });

      await auditLogService.create(tx, {
        companyId: context.companyId,
        actorProfileId: context.profileId,
        actionType: "PRODUCT_CREATED",
        referenceId: created.id,
        changes: buildCreateSummary(normalized, category.categoryName),
      });
    });
  },

  async createMany(rows: ProductBatchRowDto[]): Promise<{ count: number }> {
    const context = await mutationContextService.getContext();

    if (rows.length === 0) {
      throw new Error("No valid products found to import.");
    }

    const duplicateKeys = new Set<string>();
    for (const row of rows) {
      const key = makeDuplicateKey(row.name, row.categoryName);
      if (duplicateKeys.has(key)) {
        throw new Error(`CSV contains duplicate product '${row.name}' in category '${row.categoryName}'.`);
      }
      duplicateKeys.add(key);
    }

    const result = await prisma.$transaction(async (tx) => {
      const categoryNames = Array.from(new Set(rows.map((row) => normalizeCategoryName(row.categoryName))));
      const existingCategories = await tx.category.findMany({
        where: {
          companyId: context.companyId,
          isDeleted: false,
          categoryName: { in: categoryNames },
        },
        select: { id: true, categoryName: true },
      });

      const categoryMap = new Map(existingCategories.map((category) => [normalizeCategoryName(category.categoryName ?? ""), category.id]));

      for (const categoryName of categoryNames) {
        if (!categoryMap.has(categoryName)) {
          const createdCategory = await tx.category.create({
            data: {
              categoryName,
              companyId: context.companyId,
            },
            select: { id: true, categoryName: true },
          });
          categoryMap.set(categoryName, createdCategory.id);
        }
      }

      const existingProducts = await tx.product.findMany({
        where: {
          isDeleted: false,
          categoryId: { in: Array.from(categoryMap.values()) },
        },
        select: { name: true, categoryId: true },
      });

      const existingProductKeys = new Set(
        existingProducts.map((product) => `${product.name.trim().toUpperCase()}::${product.categoryId}`),
      );

      const data: Prisma.ProductCreateManyInput[] = rows.map((row) => {
        const categoryId = categoryMap.get(normalizeCategoryName(row.categoryName));
        if (!categoryId) {
          throw new Error(`Category '${row.categoryName}' could not be resolved.`);
        }

        const productKey = `${row.name.trim().toUpperCase()}::${categoryId}`;
        if (existingProductKeys.has(productKey)) {
          throw new Error(`Product '${row.name}' already exists in category '${row.categoryName}'.`);
        }

        return {
          name: row.name,
          barcode: row.barcode,
          baseUnit: row.baseUnit,
          quantity: row.quantity,
          cost: row.cost,
          price: row.price,
          isAvailable: row.isAvailable,
          trackInventory: row.trackInventory,
          itemType: row.itemType,
          vatType: row.vatType,
          productImageUrl: row.productImageUrl,
          categoryId,
          companyId: context.companyId,
        };
      });

      const created = await tx.product.createMany({ data });

      await auditLogService.create(tx, {
        companyId: context.companyId,
        actorProfileId: context.profileId,
        actionType: "PRODUCT_BATCH_CREATED",
        changes: `Imported ${created.count} products via CSV | Categories ${categoryNames.join(", ")} | Products ${rows
          .slice(0, 5)
          .map((row) => row.name)
          .join(", ")}${rows.length > 5 ? ", ..." : ""}`,
      });

      return created;
    });

    return { count: result.count };
  },

  async update(id: string, dto: ProductSaveDto): Promise<void> {
    const context = await mutationContextService.getContext();
    const normalized = normalizeProductInput(dto);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({
        where: { id, isDeleted: false },
        include: { category: true },
      });

      if (!existing) {
        throw new Error("Product not found.");
      }

      const category = await resolveCategory(tx, {
        categoryId: dto.categoryId,
        categoryName: dto.categoryName ?? normalized.categoryName,
        companyId: context.companyId,
      });

      await ensureUniqueProduct(tx, id, normalized.name, category.id);

      await tx.product.update({
        where: { id },
        data: {
          name: normalized.name,
          barcode: normalized.barcode,
          baseUnit: normalized.baseUnit,
          quantity: normalized.quantity,
          cost: normalized.cost,
          price: normalized.price,
          isAvailable: normalized.isAvailable,
          trackInventory: normalized.trackInventory,
          itemType: normalized.itemType,
          vatType: normalized.vatType,
          productImageUrl: normalized.productImageUrl,
          categoryId: category.id,
        },
      });

      await auditLogService.create(tx, {
        companyId: context.companyId,
        actorProfileId: context.profileId,
        actionType: "PRODUCT_UPDATED",
        referenceId: existing.id,
        changes: buildUpdateSummary(existing, category.categoryName, normalized),
      });
    });
  },

  async delete(id: string): Promise<void> {
    const context = await mutationContextService.getContext();

    await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({
        where: { id, isDeleted: false },
        include: { category: true },
      });

      if (!existing) {
        throw new Error("Product not found.");
      }

      await tx.product.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      await auditLogService.create(tx, {
        companyId: context.companyId,
        actorProfileId: context.profileId,
        actionType: "PRODUCT_DELETED",
        referenceId: existing.id,
        changes: buildDeleteSummary(existing),
      });
    });
  },

  previewBatch(csvText: string): ProductBatchPreviewDto {
    const trimmedCsv = csvText.trim();
    if (!trimmedCsv) {
      throw new Error("Uploaded file is empty.");
    }

    const parsed = Papa.parse<CsvRow>(trimmedCsv, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors[0]?.message || "CSV parsing failed.");
    }

    const rows = parsed.data.map((row, index) => parseCsvRow(row, index + 2));
    const seenKeys = new Map<string, number>();

    for (const row of rows) {
      const duplicateKey = makeDuplicateKey(row.name, row.categoryName);
      const firstSeen = seenKeys.get(duplicateKey);
      if (row.name && firstSeen) {
        row.errors.push(`Duplicate product/category combination. First seen on row ${firstSeen}.`);
      } else if (row.name) {
        seenKeys.set(duplicateKey, row.rowNumber);
      }
    }

    const validRows = rows
      .filter((row) => row.errors.length === 0)
      .map((row) => ({
        rowNumber: row.rowNumber,
        name: row.name,
        categoryName: row.categoryName,
        barcode: row.barcode,
        baseUnit: row.baseUnit,
        trackInventory: row.trackInventory,
        quantity: row.quantity,
        cost: row.cost,
        price: row.price,
        itemType: row.itemType,
        vatType: row.vatType,
        isAvailable: row.isAvailable,
        productImageUrl: row.productImageUrl,
      }));

    return {
      rows,
      validRows,
      totalRows: rows.length,
      validRowCount: validRows.length,
      invalidRowCount: rows.length - validRows.length,
    };
  },

  parseCsv(csvText: string): ProductSaveDto[] {
    const preview = this.previewBatch(csvText);

    if (preview.invalidRowCount > 0) {
      throw new Error("CSV contains invalid rows. Fix the preview errors before importing.");
    }

    return preview.validRows.map((row) => ({
      name: row.name,
      categoryName: row.categoryName,
      barcode: row.barcode ?? undefined,
      baseUnit: row.baseUnit,
      trackInventory: row.trackInventory,
      quantity: row.quantity,
      cost: row.cost,
      price: row.price,
      itemType: row.itemType,
      vatType: row.vatType,
      isAvailable: row.isAvailable,
      productImageUrl: row.productImageUrl ?? undefined,
    }));
  },

  generateCsvTemplate(): string {
    return [
      CSV_HEADERS.join(","),
      'Sample Item,BEVERAGES,SKU-001,UNIT,true,24,80,100,RESALE,VATABLE,true,https://example.com/product.png',
    ].join("\n");
  },

  toBatchRows(dtos: ProductSaveDto[]): ProductBatchRowDto[] {
    return dtos.map((dto, index) => toBatchRow(dto, index + 2));
  },
};
