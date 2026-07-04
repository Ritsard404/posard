import "server-only";

import Papa from "papaparse";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { auditLogService } from "@/lib/services/audit-log.service";
import { mutationContextService } from "@/lib/services/mutation-context.service";
import type { Prisma, BusinessMode, ItemType, ProductTrackingMode, VatType } from "@prisma/client";
import type {
  ProductBatchPreviewDto,
  ProductBatchPreviewRowDto,
  ProductBatchRowDto,
  ProductDto,
  ProductSaveDto,
  PageResponse,
} from "@/app/(protected)/product/_services/_dto/product.dto";
import type { ProductBarcodeStatusFilter } from "@/app/(protected)/product/_services/product-query";
import { assertProductImportLimits } from "./product-import-limits";

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: {
    category: true;
    preferredSupplier: true;
    modifierGroups: {
      include: {
        modifierGroup: {
          include: {
            options: true;
          };
        };
      };
    };
  };
}>;
type DbClient = typeof prisma | Prisma.TransactionClient;

const productDtoInclude = {
  category: true,
  preferredSupplier: true,
  modifierGroups: {
    include: {
      modifierGroup: {
        include: {
          options: true,
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

const SORTABLE_FIELDS: Record<string, keyof Prisma.ProductOrderByWithRelationInput> = {
  name: "name",
  price: "price",
  cost: "cost",
  quantity: "quantity",
  createdAt: "createdAt",
};

const ITEM_TYPES = new Set<ItemType>(["RESALE", "WHOLESALE"]);
const VAT_TYPES = new Set<VatType>(["VATABLE", "EXEMPT", "ZERO"]);
const PRODUCT_TRACKING_MODES = new Set<ProductTrackingMode>([
  "STANDARD",
  "SERVICE",
  "NON_STOCK",
  "VARIANT_PARENT",
  "SERIALIZED",
  "BUNDLE",
]);
const CSV_HEADERS = [
  "Product Name",
  "Category Name",
  "Barcode",
  "Generic Name",
  "Brand Name",
  "Shelf Location",
  "Prescription Required",
  "POS Favorite",
  "Reorder Point",
  "Preferred Supplier",
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

const IMPORT_WORKBOOK_HEADERS = [
  "Product Name *",
  "Price *",
  "Category Name",
  "Barcode",
  "Generic Name",
  "Brand Name",
  "Shelf Location",
  "Prescription Required",
  "POS Favorite",
  "Reorder Point",
  "Preferred Supplier",
  "Base Unit",
  "Track Inventory",
  "Quantity",
  "Cost",
  "Item Type",
  "VAT Type",
  "Available",
  "Product Image URL",
] as const;

const CSV_GUIDE_ROWS = [
  ["Product Name", "Yes", "Unique product name within the selected category.", "Coca-Cola 330ml"],
  ["Price", "Yes", "Selling price. Must be zero or greater.", "25"],
  ["Category Name", "No", "Existing or new category. Blank rows go to Uncategorized.", "DRINKS"],
  ["Barcode", "No", "Product barcode or SKU. Leave blank if unused.", "4800000111111"],
  ["Generic Name", "No", "Generic or common ingredient name for pharmacy search.", "Paracetamol"],
  ["Brand Name", "No", "Brand or marketed name shown beside the product name.", "Biogesic"],
  ["Shelf Location", "No", "Shelf, cabinet, aisle, or bin location.", "A1"],
  ["Prescription Required", "No", "Use TRUE, YES, Y, or 1 when a prescription is required.", "FALSE"],
  ["POS Favorite", "No", "Use TRUE, YES, Y, or 1 to pin this item near the top of POS search.", "TRUE"],
  ["Reorder Point", "No", "Low-stock alert level for this product. Blank uses the default threshold.", "20"],
  ["Preferred Supplier", "No", "Existing active supplier name to link as the preferred source.", "ACME Pharma"],
  ["Base Unit", "No", "Selling unit. Blank values become UNIT.", "PCS, UNIT, KG"],
  ["Track Inventory", "No", "Use TRUE, YES, Y, or 1 to track stock. Blank or FALSE disables stock tracking.", "TRUE"],
  ["Quantity", "No", "Stock count. Used only when Track Inventory is enabled.", "100"],
  ["Cost", "No", "Product cost. Must be zero or greater. Blank becomes 0.", "18"],
  ["Item Type", "No", "Allowed values: RESALE or WHOLESALE. Blank becomes RESALE.", "RESALE"],
  ["VAT Type", "No", "Allowed values: VATABLE, EXEMPT, or ZERO. Blank becomes VATABLE.", "VATABLE"],
  ["Available", "No", "Use TRUE, YES, Y, or 1 to sell now. Blank becomes TRUE.", "TRUE"],
  ["Product Image URL", "No", "Direct image URL. Leave blank if there is no product photo.", "https://example.com/product.png"],
] as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildWorkbookRow(values: readonly string[]): string {
  const cells = values
    .map(
      (value) =>
        `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`,
    )
    .join("");

  return `<Row>${cells}</Row>`;
}

function buildWorkbookColumn(width: number): string {
  return `<Column ss:Width="${width}" />`;
}

type CsvRow = Record<string, string | undefined>;

interface NormalizedProductInput {
  name: string;
  categoryName: string;
  barcode: string | null;
  genericName: string | null;
  brandName: string | null;
  shelfLocation: string | null;
  prescriptionRequired: boolean;
  posFavorite: boolean;
  reorderPoint: number | null;
  preferredSupplierId: string | null;
  preferredSupplierName: string | null;
  baseUnit: string;
  quantity: number | null;
  cost: number;
  price: number;
  isAvailable: boolean;
  trackInventory: boolean;
  itemType: ItemType;
  trackingMode: ProductTrackingMode;
  serviceDurationMinutes: number | null;
  warrantyDays: number | null;
  vatType: VatType;
  productImageUrl: string | null;
  isConfigurable: boolean;
  configurationMode: BusinessMode | null;
}

async function getCompanyId(): Promise<string | null> {
  const profile = await getCurrentProfile();
  return profile?.companyId ?? null;
}

function toProductDto(product: ProductWithCategory): ProductDto {
  const cost = Number(product.cost);
  const price = Number(product.price);

  return {
    id: product.id,
    name: product.name,
    productImageUrl: product.productImageUrl,
    genericName: product.genericName,
    brandName: product.brandName,
    shelfLocation: product.shelfLocation,
    prescriptionRequired: product.prescriptionRequired,
    posFavorite: product.posFavorite,
    reorderPoint: product.reorderPoint === null ? null : Number(product.reorderPoint),
    preferredSupplierId: product.preferredSupplierId,
    preferredSupplierName: product.preferredSupplier?.name ?? null,
    markupPercent: cost > 0 ? Math.round(((price - cost) / cost) * 10000) / 100 : null,
    isConfigurable: product.isConfigurable,
    configurationMode: product.configurationMode,
    modifierGroups: product.modifierGroups
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((link) => ({
        id: link.modifierGroup.id,
        name: link.modifierGroup.name,
        type: link.modifierGroup.type,
        required: link.modifierGroup.required,
        minSelect: link.modifierGroup.minSelect,
        maxSelect: link.modifierGroup.maxSelect,
        displayOrder: link.displayOrder || link.modifierGroup.displayOrder,
        options: link.modifierGroup.options
          .filter((option) => option.isActive)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((option) => ({
            id: option.id,
            name: option.name,
            priceDelta: Number(option.priceDelta),
            displayOrder: option.displayOrder,
            isDefault: option.isDefault,
          })),
      })),
    barcode: product.barcode,
    baseUnit: product.baseUnit,
    quantity: product.quantity === null ? null : Number(product.quantity),
    cost,
    price,
    isAvailable: product.isAvailable,
    trackInventory: product.trackInventory,
    itemType: product.itemType,
    trackingMode: product.trackingMode,
    serviceDurationMinutes: product.serviceDurationMinutes,
    warrantyDays: product.warrantyDays,
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

function parseNonNegativeOptionalNumber(
  value: number | string | null | undefined,
  label: string,
): number | null {
  const parsed = parseOptionalNumber(value);
  if (parsed !== null && parsed < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }

  return parsed;
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

  const trackingMode = dto.trackingMode ?? "STANDARD";
  if (!PRODUCT_TRACKING_MODES.has(trackingMode)) {
    throw new Error("Product tracking mode is invalid.");
  }

  const trackInventory =
    trackingMode === "SERVICE" || trackingMode === "NON_STOCK"
      ? false
      : dto.trackInventory ?? false;
  const parsedQuantity = parseOptionalNumber(dto.quantity);
  const quantity = trackInventory ? parsedQuantity ?? 0 : null;
  const reorderPoint = parseNonNegativeOptionalNumber(dto.reorderPoint, "Reorder point");
  const serviceDurationMinutes = parseNonNegativeOptionalNumber(
    dto.serviceDurationMinutes,
    "Service duration",
  );
  const warrantyDays = parseNonNegativeOptionalNumber(dto.warrantyDays, "Warranty days");

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
    genericName: asOptionalString(dto.genericName),
    brandName: asOptionalString(dto.brandName),
    shelfLocation: asOptionalString(dto.shelfLocation),
    prescriptionRequired: dto.prescriptionRequired ?? false,
    posFavorite: dto.posFavorite ?? false,
    reorderPoint,
    preferredSupplierId: asOptionalString(dto.preferredSupplierId),
    preferredSupplierName: asOptionalString(dto.preferredSupplierName),
    baseUnit: dto.baseUnit?.trim() || "UNIT",
    quantity,
    cost,
    price,
    isAvailable: dto.isAvailable ?? true,
    trackInventory,
    itemType,
    trackingMode,
    serviceDurationMinutes,
    warrantyDays,
    vatType,
    productImageUrl: asOptionalString(dto.productImageUrl),
    isConfigurable: dto.isConfigurable ?? false,
    configurationMode: dto.configurationMode ?? null,
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
    input.reorderPoint === null ? "Reorder point default" : `Reorder point ${input.reorderPoint}`,
    input.genericName ? `Generic ${input.genericName}` : null,
    input.brandName ? `Brand ${input.brandName}` : null,
    input.preferredSupplierName ? `Preferred supplier ${input.preferredSupplierName}` : null,
    input.prescriptionRequired ? "Prescription required" : null,
    input.posFavorite ? "POS favorite" : null,
    `VAT ${input.vatType}`,
  ].filter(Boolean).join(" | ");
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
    createFieldChange("Generic", formatValue(existing.genericName), formatValue(next.genericName)),
    createFieldChange("Brand", formatValue(existing.brandName), formatValue(next.brandName)),
    createFieldChange("Shelf", formatValue(existing.shelfLocation), formatValue(next.shelfLocation)),
    createFieldChange("Prescription", formatValue(existing.prescriptionRequired), formatValue(next.prescriptionRequired)),
    createFieldChange("POS favorite", formatValue(existing.posFavorite), formatValue(next.posFavorite)),
    createFieldChange("Reorder point", formatValue(existing.reorderPoint === null ? null : Number(existing.reorderPoint)), formatValue(next.reorderPoint)),
    createFieldChange("Preferred supplier", formatValue(existing.preferredSupplier?.name), formatValue(next.preferredSupplierName)),
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
    genericName: normalized.genericName,
    brandName: normalized.brandName,
    shelfLocation: normalized.shelfLocation,
    prescriptionRequired: normalized.prescriptionRequired,
    posFavorite: normalized.posFavorite,
    reorderPoint: normalized.reorderPoint,
    preferredSupplierName: normalized.preferredSupplierName,
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

function makeBrandGenericDuplicateKey(input: {
  genericName?: string | null;
  brandName?: string | null;
  categoryName: string;
}): string | null {
  if (!input.genericName || !input.brandName) {
    return null;
  }

  return `${input.brandName.trim().toUpperCase()}::${input.genericName.trim().toUpperCase()}::${normalizeCategoryName(input.categoryName)}`;
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
  const reorderPointValue = parseOptionalNumber(rawRow["reorder point"]);

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

  if (reorderPointValue !== null && reorderPointValue < 0) {
    errors.push("Reorder Point must be zero or greater.");
  }

  const row: ProductBatchPreviewRowDto = {
    rowNumber,
    name,
    categoryName: normalizeCategoryName(rawRow["category name"]),
    barcode: asOptionalString(rawRow["barcode"]),
    genericName: asOptionalString(rawRow["generic name"]),
    brandName: asOptionalString(rawRow["brand name"]),
    shelfLocation: asOptionalString(rawRow["shelf location"]),
    prescriptionRequired: parseBooleanValue(rawRow["prescription required"], false),
    posFavorite: parseBooleanValue(rawRow["pos favorite"], false),
    reorderPoint: reorderPointValue,
    preferredSupplierName: asOptionalString(rawRow["preferred supplier"]),
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

async function resolvePreferredSupplier(
  client: DbClient,
  params: {
    companyId: string;
    preferredSupplierId?: string | null;
    preferredSupplierName?: string | null;
  },
): Promise<{ id: string; name: string } | null> {
  const { companyId, preferredSupplierId, preferredSupplierName } = params;

  if (preferredSupplierId) {
    const supplier = await client.supplier.findFirst({
      where: { id: preferredSupplierId, companyId, status: "active" },
      select: { id: true, name: true },
    });

    if (!supplier) {
      throw new Error("Preferred supplier was not found.");
    }

    return supplier;
  }

  if (!preferredSupplierName) {
    return null;
  }

  const supplier = await client.supplier.findFirst({
    where: {
      companyId,
      status: "active",
      name: { equals: preferredSupplierName, mode: "insensitive" },
    },
    select: { id: true, name: true },
  });

  if (!supplier) {
    throw new Error(`Preferred supplier '${preferredSupplierName}' does not exist or is inactive.`);
  }

  return supplier;
}

async function ensureUniqueProduct(
  client: DbClient,
  productId: string | null,
  input: NormalizedProductInput,
  categoryId: string,
): Promise<void> {
  const probableDuplicateRules: Prisma.ProductWhereInput[] = [
    { name: { equals: input.name, mode: "insensitive" }, categoryId },
  ];

  if (input.genericName && input.brandName) {
    probableDuplicateRules.push({
      categoryId,
      genericName: { equals: input.genericName, mode: "insensitive" },
      brandName: { equals: input.brandName, mode: "insensitive" },
    });
  }

  const duplicate = await client.product.findFirst({
    where: {
      OR: probableDuplicateRules,
      isDeleted: false,
      ...(productId ? { NOT: { id: productId } } : {}),
    },
    select: { id: true, name: true, genericName: true, brandName: true },
  });

  if (duplicate) {
    if (
      input.genericName &&
      input.brandName &&
      duplicate.genericName?.toLowerCase() === input.genericName.toLowerCase() &&
      duplicate.brandName?.toLowerCase() === input.brandName.toLowerCase()
    ) {
      throw new Error("Probable duplicate product already exists for this brand, generic name, and category.");
    }

    throw new Error("Product name already exists in this category.");
  }
}

async function ensureUniqueBarcode(
  client: DbClient,
  productId: string | null,
  companyId: string,
  barcode: string | null,
): Promise<void> {
  if (!barcode) return;

  const duplicate = await client.product.findFirst({
    where: {
      barcode,
      companyId,
      isDeleted: false,
      ...(productId ? { NOT: { id: productId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new Error("Barcode is already assigned to another product.");
  }
}

async function syncProductModifierGroups(
  tx: Prisma.TransactionClient,
  productId: string,
  companyId: string,
  groups: ProductSaveDto["modifierGroups"] | undefined,
) {
  await tx.productModifierGroup.deleteMany({ where: { productId } });

  if (!groups?.length) return;

  for (const [groupIndex, group] of groups.entries()) {
    const minSelect = group.required
      ? Math.max(1, group.minSelect ?? 1)
      : Math.max(0, group.minSelect ?? 0);
    const maxSelect = Math.max(1, group.maxSelect ?? 1);

    const modifierGroup = group.id
      ? await tx.modifierGroup.update({
          where: { id: group.id },
          data: {
            name: group.name.trim(),
            type: group.type,
            required: group.required ?? false,
            minSelect,
            maxSelect,
            displayOrder: group.displayOrder ?? groupIndex,
            isActive: true,
          },
          select: { id: true },
        })
      : await tx.modifierGroup.create({
          data: {
            companyId,
            name: group.name.trim(),
            type: group.type,
            required: group.required ?? false,
            minSelect,
            maxSelect,
            displayOrder: group.displayOrder ?? groupIndex,
            isActive: true,
          },
          select: { id: true },
        });

    await tx.modifierOption.deleteMany({
      where: { modifierGroupId: modifierGroup.id },
    });

    if (group.options.length === 0) {
      throw new Error(`Modifier group "${group.name}" needs at least one option.`);
    }

    await tx.modifierOption.createMany({
      data: group.options.map((option, optionIndex) => ({
        modifierGroupId: modifierGroup.id,
        name: option.name.trim(),
        priceDelta: option.priceDelta ?? 0,
        displayOrder: option.displayOrder ?? optionIndex,
        isDefault: option.isDefault ?? false,
        isActive: true,
      })),
    });

    await tx.productModifierGroup.create({
      data: {
        productId,
        modifierGroupId: modifierGroup.id,
        displayOrder: group.displayOrder ?? groupIndex,
      },
    });
  }
}

export const productService = {
  async findAll(params?: {
    keyword?: string;
    barcode?: string;
    categoryId?: string;
    barcodeStatus?: ProductBarcodeStatusFilter;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: "asc" | "desc";
  }): Promise<PageResponse<ProductDto>> {
    const companyId = await getCompanyId();
    return this.findAllForCompany(companyId, params);
  },

  async findAllForCompany(
    companyId: string | null,
    params?: {
      keyword?: string;
      barcode?: string;
      categoryId?: string;
      barcodeStatus?: ProductBarcodeStatusFilter;
      page?: number;
      size?: number;
      sortBy?: string;
      direction?: "asc" | "desc";
    },
  ): Promise<PageResponse<ProductDto>> {
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
          { genericName: { contains: params.keyword, mode: "insensitive" } },
          { brandName: { contains: params.keyword, mode: "insensitive" } },
          { shelfLocation: { contains: params.keyword, mode: "insensitive" } },
          { category: { categoryName: { contains: params.keyword, mode: "insensitive" } } },
          {
            preferredSupplier: {
              is: { name: { contains: params.keyword, mode: "insensitive" } },
            },
          },
        ],
      });
    }

    if (companyId) {
      andConditions.push({
        OR: [{ companyId }, { companyId: null }],
      });
    }

    if (params?.barcodeStatus === "with") {
      andConditions.push({ barcode: { not: null } });
    }

    if (params?.barcodeStatus === "without") {
      andConditions.push({ barcode: null });
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
        include: productDtoInclude,
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
      include: productDtoInclude,
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
    return this.findByCategoryForCompany(companyId, params);
  },

  async findByCategoryForCompany(
    companyId: string | null,
    params: {
      categoryId: string;
      page?: number;
      size?: number;
      sortBy?: string;
      direction?: "asc" | "desc";
    },
  ): Promise<ProductDto[]> {
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
      include: productDtoInclude,
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
      const preferredSupplier = await resolvePreferredSupplier(tx, {
        companyId: context.companyId,
        preferredSupplierId: normalized.preferredSupplierId,
        preferredSupplierName: normalized.preferredSupplierName,
      });

      await ensureUniqueProduct(tx, null, normalized, category.id);
      await ensureUniqueBarcode(tx, null, context.companyId, normalized.barcode);

      const created = await tx.product.create({
        data: {
          name: normalized.name,
          barcode: normalized.barcode,
          genericName: normalized.genericName,
          brandName: normalized.brandName,
          shelfLocation: normalized.shelfLocation,
          prescriptionRequired: normalized.prescriptionRequired,
          posFavorite: normalized.posFavorite,
          reorderPoint: normalized.reorderPoint,
          preferredSupplierId: preferredSupplier?.id ?? null,
          baseUnit: normalized.baseUnit,
          quantity: normalized.quantity,
          cost: normalized.cost,
          price: normalized.price,
          isAvailable: normalized.isAvailable,
          trackInventory: normalized.trackInventory,
          itemType: normalized.itemType,
          trackingMode: normalized.trackingMode,
          serviceDurationMinutes: normalized.serviceDurationMinutes,
          warrantyDays: normalized.warrantyDays,
          vatType: normalized.vatType,
          productImageUrl: normalized.productImageUrl,
          isConfigurable: normalized.isConfigurable,
          configurationMode: normalized.configurationMode,
          categoryId: category.id,
          companyId: context.companyId,
        },
      });

      await syncProductModifierGroups(
        tx,
        created.id,
        context.companyId,
        dto.modifierGroups,
      );

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
    const duplicateBrandGenericKeys = new Set<string>();
    for (const row of rows) {
      const key = makeDuplicateKey(row.name, row.categoryName);
      if (duplicateKeys.has(key)) {
        throw new Error(`CSV contains duplicate product '${row.name}' in category '${row.categoryName}'.`);
      }
      duplicateKeys.add(key);

      const brandGenericKey = makeBrandGenericDuplicateKey(row);
      if (brandGenericKey) {
        if (duplicateBrandGenericKeys.has(brandGenericKey)) {
          throw new Error(`CSV contains duplicate brand/generic product '${row.brandName} ${row.genericName}' in category '${row.categoryName}'.`);
        }
        duplicateBrandGenericKeys.add(brandGenericKey);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const categoryNames = Array.from(new Set(rows.map((row) => normalizeCategoryName(row.categoryName))));
      const supplierNames = Array.from(
        new Set(
          rows
            .map((row) => row.preferredSupplierName?.trim())
            .filter((name): name is string => Boolean(name)),
        ),
      );
      const existingCategories = await tx.category.findMany({
        where: {
          companyId: context.companyId,
          isDeleted: false,
          categoryName: { in: categoryNames },
        },
        select: { id: true, categoryName: true },
      });

      const categoryMap = new Map(existingCategories.map((category) => [normalizeCategoryName(category.categoryName ?? ""), category.id]));
      const existingSuppliers = supplierNames.length
        ? await tx.supplier.findMany({
            where: {
              companyId: context.companyId,
              status: "active",
              OR: supplierNames.map((name) => ({
                name: { equals: name, mode: "insensitive" },
              })),
            },
            select: { id: true, name: true },
          })
        : [];
      const supplierMap = new Map(
        existingSuppliers.map((supplier) => [supplier.name.trim().toUpperCase(), supplier.id]),
      );

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
          OR: [
            { categoryId: { in: Array.from(categoryMap.values()) } },
            {
              companyId: context.companyId,
              barcode: { in: rows.map((row) => row.barcode).filter(Boolean) as string[] },
            },
          ],
        },
        select: { name: true, categoryId: true, barcode: true, genericName: true, brandName: true },
      });

      const existingProductKeys = new Set(
        existingProducts.map((product) => `${product.name.trim().toUpperCase()}::${product.categoryId}`),
      );
      const existingBarcodes = new Set(
        existingProducts
          .map((product) => product.barcode?.trim())
          .filter((barcode): barcode is string => Boolean(barcode)),
      );
      const existingBrandGenericKeys = new Set(
        existingProducts
          .map((product) =>
            product.genericName && product.brandName
              ? `${product.brandName.trim().toUpperCase()}::${product.genericName.trim().toUpperCase()}::${product.categoryId}`
              : null,
          )
          .filter((key): key is string => Boolean(key)),
      );
      const importBarcodes = new Set<string>();

      const data: Prisma.ProductCreateManyInput[] = rows.map((row) => {
        const categoryId = categoryMap.get(normalizeCategoryName(row.categoryName));
        if (!categoryId) {
          throw new Error(`Category '${row.categoryName}' could not be resolved.`);
        }

        const supplierId = row.preferredSupplierName
          ? supplierMap.get(row.preferredSupplierName.trim().toUpperCase())
          : null;

        if (row.preferredSupplierName && !supplierId) {
          throw new Error(`Preferred supplier '${row.preferredSupplierName}' does not exist or is inactive.`);
        }

        const productKey = `${row.name.trim().toUpperCase()}::${categoryId}`;
        if (existingProductKeys.has(productKey)) {
          throw new Error(`Product '${row.name}' already exists in category '${row.categoryName}'.`);
        }

        if (row.genericName && row.brandName) {
          const brandGenericKey = `${row.brandName.trim().toUpperCase()}::${row.genericName.trim().toUpperCase()}::${categoryId}`;
          if (existingBrandGenericKeys.has(brandGenericKey)) {
            throw new Error(`Probable duplicate product '${row.brandName} ${row.genericName}' already exists in category '${row.categoryName}'.`);
          }
        }

        if (row.barcode) {
          if (existingBarcodes.has(row.barcode) || importBarcodes.has(row.barcode)) {
            throw new Error(`Barcode '${row.barcode}' is already assigned to another product.`);
          }
          importBarcodes.add(row.barcode);
        }

        return {
          name: row.name,
          barcode: row.barcode,
          genericName: row.genericName,
          brandName: row.brandName,
          shelfLocation: row.shelfLocation,
          prescriptionRequired: row.prescriptionRequired,
          posFavorite: row.posFavorite,
          reorderPoint: row.reorderPoint,
          preferredSupplierId: supplierId,
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
        include: productDtoInclude,
      });

      if (!existing) {
        throw new Error("Product not found.");
      }

      const category = await resolveCategory(tx, {
        categoryId: dto.categoryId,
        categoryName: dto.categoryName ?? normalized.categoryName,
        companyId: context.companyId,
      });
      const preferredSupplier = await resolvePreferredSupplier(tx, {
        companyId: context.companyId,
        preferredSupplierId: normalized.preferredSupplierId,
        preferredSupplierName: normalized.preferredSupplierName,
      });

      await ensureUniqueProduct(tx, id, normalized, category.id);
      await ensureUniqueBarcode(tx, id, context.companyId, normalized.barcode);

      await tx.product.update({
        where: { id },
        data: {
          name: normalized.name,
          barcode: normalized.barcode,
          genericName: normalized.genericName,
          brandName: normalized.brandName,
          shelfLocation: normalized.shelfLocation,
          prescriptionRequired: normalized.prescriptionRequired,
          posFavorite: normalized.posFavorite,
          reorderPoint: normalized.reorderPoint,
          preferredSupplierId: preferredSupplier?.id ?? null,
          baseUnit: normalized.baseUnit,
          quantity: normalized.quantity,
          cost: normalized.cost,
          price: normalized.price,
          isAvailable: normalized.isAvailable,
          trackInventory: normalized.trackInventory,
          itemType: normalized.itemType,
          trackingMode: normalized.trackingMode,
          serviceDurationMinutes: normalized.serviceDurationMinutes,
          warrantyDays: normalized.warrantyDays,
          vatType: normalized.vatType,
          productImageUrl: normalized.productImageUrl,
          isConfigurable: normalized.isConfigurable,
          configurationMode: normalized.configurationMode,
          categoryId: category.id,
        },
      });

      await syncProductModifierGroups(
        tx,
        id,
        context.companyId,
        dto.modifierGroups,
      );

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
        include: productDtoInclude,
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

    assertProductImportLimits({ csvText: trimmedCsv });

    const parsed = Papa.parse<CsvRow>(trimmedCsv, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) =>
        header
          .trim()
          .replace(/\s*\*+$/, "")
          .toLowerCase(),
    });

    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors[0]?.message || "CSV parsing failed.");
    }

    assertProductImportLimits({ csvText: trimmedCsv });

    const rows = parsed.data.map((row, index) => parseCsvRow(row, index + 2));
    const seenKeys = new Map<string, number>();
    const seenBrandGenericKeys = new Map<string, number>();

    for (const row of rows) {
      const duplicateKey = makeDuplicateKey(row.name, row.categoryName);
      const firstSeen = seenKeys.get(duplicateKey);
      if (row.name && firstSeen) {
        row.errors.push(`Duplicate product/category combination. First seen on row ${firstSeen}.`);
      } else if (row.name) {
        seenKeys.set(duplicateKey, row.rowNumber);
      }

      const brandGenericKey = makeBrandGenericDuplicateKey(row);
      const firstBrandGenericSeen = brandGenericKey
        ? seenBrandGenericKeys.get(brandGenericKey)
        : undefined;
      if (brandGenericKey && firstBrandGenericSeen) {
        row.errors.push(`Duplicate brand/generic/category combination. First seen on row ${firstBrandGenericSeen}.`);
      } else if (brandGenericKey) {
        seenBrandGenericKeys.set(brandGenericKey, row.rowNumber);
      }
    }

    const validRows = rows
      .filter((row) => row.errors.length === 0)
      .map((row) => ({
        rowNumber: row.rowNumber,
        name: row.name,
        categoryName: row.categoryName,
        barcode: row.barcode,
        genericName: row.genericName,
        brandName: row.brandName,
        shelfLocation: row.shelfLocation,
        prescriptionRequired: row.prescriptionRequired,
        posFavorite: row.posFavorite,
        reorderPoint: row.reorderPoint,
        preferredSupplierName: row.preferredSupplierName,
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
      genericName: row.genericName ?? undefined,
      brandName: row.brandName ?? undefined,
      shelfLocation: row.shelfLocation ?? undefined,
      prescriptionRequired: row.prescriptionRequired,
      posFavorite: row.posFavorite,
      reorderPoint: row.reorderPoint,
      preferredSupplierName: row.preferredSupplierName ?? undefined,
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
      'Biogesic 500mg,MEDICINES,SKU-001,Paracetamol,Biogesic,A1,FALSE,TRUE,20,,BOX,true,24,80,100,RESALE,VATABLE,true,https://example.com/product.png',
    ].join("\n");
  },

  generateImportWorkbookTemplate(): string {
    const templateRows = [
      buildWorkbookRow(IMPORT_WORKBOOK_HEADERS),
      buildWorkbookRow([
        "Biogesic 500mg",
        "100",
        "MEDICINES",
        "4800000111111",
        "Paracetamol",
        "Biogesic",
        "A1",
        "FALSE",
        "TRUE",
        "20",
        "",
        "BOX",
        "TRUE",
        "24",
        "80",
        "RESALE",
        "VATABLE",
        "TRUE",
        "",
      ]),
      buildWorkbookRow([
        "Amoxicillin 500mg",
        "12",
        "ANTIBIOTICS",
        "4800000222222",
        "Amoxicillin",
        "Generic",
        "B2",
        "TRUE",
        "FALSE",
        "30",
        "",
        "CAPSULE",
        "TRUE",
        "50",
        "8",
        "RESALE",
        "EXEMPT",
        "TRUE",
        "",
      ]),
      buildWorkbookRow([
        "Vitamin C 500mg",
        "35",
        "VITAMINS",
        "4800000333333",
        "Ascorbic Acid",
        "Generic",
        "C1",
        "FALSE",
        "FALSE",
        "25",
        "",
        "TABLET",
        "TRUE",
        "30",
        "25",
        "RESALE",
        "VATABLE",
        "TRUE",
        "",
      ]),
      buildWorkbookRow([
        "Alcohol 70% 500ml",
        "65",
        "FIRST AID",
        "4800000444444",
        "Isopropyl Alcohol",
        "Store Brand",
        "D1",
        "FALSE",
        "FALSE",
        "12",
        "",
        "BOTTLE",
        "TRUE",
        "80",
        "45",
        "RESALE",
        "VATABLE",
        "TRUE",
        "",
      ]),
    ].join("");

    const guideRows = [
      buildWorkbookRow(["POSARD Product Import Guide", "", "", ""]),
      buildWorkbookRow(["Fill in your products using the Products sheet. Fields marked with * are required.", "", "", ""]),
      buildWorkbookRow(["", "", "", ""]),
      buildWorkbookRow(["Column", "Required", "Description", "Example"]),
      ...CSV_GUIDE_ROWS.map((row) => buildWorkbookRow(row)),
      buildWorkbookRow(["", "", "", ""]),
      buildWorkbookRow(["Important Notes:", "", "", ""]),
      buildWorkbookRow(["• Fields marked with * in the Products sheet are required", "", "", ""]),
      buildWorkbookRow(["• Use one product per row", "", "", ""]),
      buildWorkbookRow(["• Do not repeat the same Product Name under the same Category Name", "", "", ""]),
      buildWorkbookRow(["• Brand Name plus Generic Name must not duplicate another product in the same category", "", "", ""]),
      buildWorkbookRow(["• Preferred Supplier must match an existing active supplier name when provided", "", "", ""]),
      buildWorkbookRow(["• Quantity, Cost, and Price must be valid numbers", "", "", ""]),
      buildWorkbookRow(["• Reorder Point must be zero or greater when provided", "", "", ""]),
      buildWorkbookRow(["• Boolean fields accept TRUE, FALSE, YES, NO, Y, N, 1, or 0", "", "", ""]),
      buildWorkbookRow(["• Delete the sample data rows before importing your products", "", "", ""]),
      buildWorkbookRow(["• You can upload CSV files or this POSARD Excel XML template directly", "", "", ""]),
      buildWorkbookRow(["• Duplicate products in the same category will be blocked", "", "", ""]),
    ].join("");

    const productColumns = [180, 80, 140, 140, 140, 140, 110, 100, 130, 100, 150, 90, 110, 90, 80, 100, 100, 90, 220]
      .map(buildWorkbookColumn)
      .join("");
    const guideColumns = [180, 90, 420, 220].map(buildWorkbookColumn).join("");

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Products">
    <Table>${productColumns}${templateRows}</Table>
  </Worksheet>
  <Worksheet ss:Name="Instructions">
    <Table>${guideColumns}${guideRows}</Table>
  </Worksheet>
</Workbook>`;
  },

  toBatchRows(dtos: ProductSaveDto[]): ProductBatchRowDto[] {
    return dtos.map((dto, index) => toBatchRow(dto, index + 2));
  },
};
