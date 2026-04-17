"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { inventoryService } from "@/app/(protected)/product/_services/inventory.service";
import type {
  InventoryDto,
  InventoryTransactionRequestDto,
} from "@/app/(protected)/product/_services/_dto/inventory.dto";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { getProductListTag } from "@/app/(protected)/product/_services/product-cache";

async function revalidateProductInventory() {
  const companyId = (await getCurrentProfile())?.companyId ?? null;

  revalidateTag(getProductListTag(companyId), "max");
  revalidatePath("/product");
}

export async function findAllInventory(): Promise<InventoryDto[]> {
  return inventoryService.findAll();
}

export async function stockProduct(
  productId: string,
  qty: number,
): Promise<{ error?: string }> {
  try {
    await inventoryService.stockProduct(productId, qty);
    await revalidateProductInventory();
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
    await revalidateProductInventory();
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}
