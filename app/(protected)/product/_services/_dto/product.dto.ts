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
  quantity?: number;
  cost?: number;
  price: number;
  isAvailable?: boolean;
  trackInventory?: boolean;
  itemType?: ItemType;
  vatType?: VatType;
  productImageUrl?: string;
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
