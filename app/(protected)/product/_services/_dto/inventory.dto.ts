import type { InventoryTransactionType } from "@prisma/client";

// ─────────────────────────────────────────────
// Response DTO (mirrors Java InventoryDto)
// ─────────────────────────────────────────────

export interface InventoryDto {
  id: string;
  quantity: number;
  type: InventoryTransactionType;
  reference: string | null;
  productId: string;
  productName: string;
}

// ─────────────────────────────────────────────
// Request DTO (mirrors Java InventoryTransactionRequestDto)
// ─────────────────────────────────────────────

export interface InventoryTransactionRequestDto {
  productId: string;
  quantity: number;
  inventoryTransactionType: InventoryTransactionType;
  reference?: string;
}
