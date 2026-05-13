import type { BusinessMode, ItemType, ModifierGroupType, VatType } from "@prisma/client";

export interface ModifierOptionDto {
  id: string;
  name: string;
  priceDelta: number;
  displayOrder: number;
  isDefault: boolean;
}

export interface ModifierGroupDto {
  id: string;
  name: string;
  type: ModifierGroupType;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  displayOrder: number;
  options: ModifierOptionDto[];
}

// ─────────────────────────────────────────────
// Response DTO (mirrors Java ProductDto)
// ─────────────────────────────────────────────

export interface ProductDto {
  id: string;
  name: string;
  productImageUrl: string | null;
  barcode: string | null;
  baseUnit: string;
  quantity: number | null;
  cost: number;
  price: number;
  isAvailable: boolean;
  trackInventory: boolean;
  itemType: ItemType;
  vatType: VatType;
  categoryId: string;
  categoryName: string | null;
  isConfigurable: boolean;
  configurationMode: BusinessMode | null;
  modifierGroups: ModifierGroupDto[];
}

// ─────────────────────────────────────────────
// Save DTO (mirrors Java ProductSaveDto)
// ─────────────────────────────────────────────

export interface ProductSaveDto {
  name: string;
  categoryId?: string;
  categoryName?: string;
  barcode?: string;
  baseUnit?: string;
  quantity?: number | null;
  cost?: number;
  price: number;
  isAvailable?: boolean;
  trackInventory?: boolean;
  itemType?: ItemType;
  vatType?: VatType;
  productImageUrl?: string;
  isConfigurable?: boolean;
  configurationMode?: BusinessMode | null;
  modifierGroups?: Array<{
    id?: string;
    name: string;
    type: ModifierGroupType;
    required?: boolean;
    minSelect?: number;
    maxSelect?: number;
    displayOrder?: number;
    options: Array<{
      id?: string;
      name: string;
      priceDelta?: number;
      displayOrder?: number;
      isDefault?: boolean;
    }>;
  }>;
}

export interface ProductBatchRowDto {
  rowNumber: number;
  name: string;
  categoryName: string;
  barcode: string | null;
  baseUnit: string;
  trackInventory: boolean;
  quantity: number | null;
  cost: number;
  price: number;
  itemType: ItemType;
  vatType: VatType;
  isAvailable: boolean;
  productImageUrl: string | null;
}

export interface ProductBatchPreviewRowDto extends ProductBatchRowDto {
  errors: string[];
}

export interface ProductBatchPreviewDto {
  rows: ProductBatchPreviewRowDto[];
  validRows: ProductBatchRowDto[];
  totalRows: number;
  validRowCount: number;
  invalidRowCount: number;
}

export type BarcodeGenerationMode = "missing_only" | "replace_existing";

export interface BarcodeGenerationResultDto {
  updatedCount: number;
  skippedCount: number;
}

export interface BarcodeLabelProductDto {
  id: string;
  name: string;
  barcode: string;
  price: number;
  categoryName: string | null;
  baseUnit: string;
  quantity: number;
}

// ─────────────────────────────────────────────
// Paginated response (mirrors Java PageHelper.toPageResponse)
// ─────────────────────────────────────────────

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
