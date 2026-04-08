"use server";

import { inventoryService } from "@/app/(protected)/product/_services/inventory.service";
import type {
  InventoryDto,
  InventoryTransactionRequestDto,
} from "@/app/(protected)/product/_services/_dto/inventory.dto";

export async function findAllInventory(): Promise<InventoryDto[]> {
  return inventoryService.findAll();
}

export async function stockProduct(
  productId: string,
  qty: number,
): Promise<{ error?: string }> {
  try {
    await inventoryService.stockProduct(productId, qty);
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function recordInventoryTransaction(
  dto: InventoryTransactionRequestDto,
): Promise<{ error?: string }> {
  try {
    await inventoryService.recordTransaction(dto);
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}