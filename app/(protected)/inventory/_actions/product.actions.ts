"use server";

import type {
  ProductDto,
  ProductSaveDto,
  PageResponse,
} from "@/app/(protected)/inventory/_services/_dto/product.dto";
import { productService } from "../_services/product.service";

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
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function createManyProducts(
  dtos: ProductSaveDto[],
): Promise<{ error?: string }> {
  try {
    await productService.createMany(dtos);
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
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  try {
    await productService.delete(id);
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
  csvText: string,
): Promise<{ error?: string }> {
  try {
    if (!csvText.trim()) throw new Error("Uploaded file is empty.");
    const dtos = productService.parseCsv(csvText);
    await productService.createMany(dtos);
    return {};
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
