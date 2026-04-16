import type { ItemType, VatType } from "@prisma/client";

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
