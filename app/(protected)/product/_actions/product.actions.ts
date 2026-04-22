"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type {
  ProductBatchPreviewDto,
  ProductBatchRowDto,
  ProductDto,
  ProductSaveDto,
  PageResponse,
} from "@/app/(protected)/product/_services/_dto/product.dto";
import { getCurrentProfile } from "@/lib/auth/current-user";
import {
  getProductCategoriesTag,
  getProductListTag,
} from "@/app/(protected)/product/_services/product-cache";
import { productService } from "../_services/product.service";

async function revalidateProductData() {
  const companyId = (await getCurrentProfile())?.companyId ?? null;

  revalidateTag(getProductListTag(companyId), "max");
  revalidateTag(getProductCategoriesTag(companyId), "max");
  revalidatePath("/product");
}

export async function findAllProducts(params?: {
  keyword?: string;
  barcode?: string;
  categoryId?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "asc" | "desc";
}): Promise<PageResponse<ProductDto>> {
  return productService.findAll(params);
}

export async function findProductById(id: string): Promise<ProductDto | null> {
  return productService.findById(id);
}

export async function findProductsByCategory(params: {
  categoryId: string;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "asc" | "desc";
}): Promise<ProductDto[]> {
  return productService.findByCategory(params);
}

export async function createProduct(
  dto: ProductSaveDto,
): Promise<{ error?: string }> {
  try {
    await productService.create(dto);
    await revalidateProductData();
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function createManyProducts(
  rows: ProductBatchRowDto[],
): Promise<{ error?: string }> {
  try {
    await productService.createMany(rows);
    await revalidateProductData();
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function updateProduct(
  id: string,
  dto: ProductSaveDto,
): Promise<{ error?: string }> {
  try {
    await productService.update(id, dto);
    await revalidateProductData();
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  try {
    await productService.delete(id);
    await revalidateProductData();
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Parses raw CSV text (from a file upload) into ProductSaveDto[]
 * then bulk-creates them. Mirrors batchUploadNewProducts().
 */
export async function batchUploadProducts(
  rows: ProductBatchRowDto[],
): Promise<{ error?: string }> {
  try {
    await productService.createMany(rows);
    await revalidateProductData();
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function previewBatchUploadProducts(
  csvText: string,
): Promise<ProductBatchPreviewDto | { error: string }> {
  try {
    return productService.previewBatch(csvText);
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Returns a CSV template string the client can trigger as a download.
 * Mirrors generateCsvTemplate().
 */
export async function getProductCsvTemplate(): Promise<string> {
  return productService.generateCsvTemplate();
}

export async function getProductImportWorkbookTemplate(): Promise<string> {
  return productService.generateImportWorkbookTemplate();
}
