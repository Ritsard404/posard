"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { categoryService } from "@/app/(protected)/product/_services/category.service";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";
import { getCurrentProfile } from "@/lib/auth/current-user";
import {
  getProductCategoriesTag,
  getProductListTag,
} from "@/app/(protected)/product/_services/product-cache";

async function revalidateProductData() {
  const companyId = (await getCurrentProfile())?.companyId ?? null;

  revalidateTag(getProductCategoriesTag(companyId), "max");
  revalidateTag(getProductListTag(companyId), "max");
  revalidatePath("/product");
}

export async function findAllCategories(): Promise<CategoryDto[]> {
  return categoryService.findAll();
}

export async function findAllCategoriesByCompany(): Promise<CategoryDto[]> {
  return categoryService.findAllByCompany();
}

export async function findCategoryById(
  id: string,
): Promise<CategoryDto | null> {
  return categoryService.findById(id);
}

export async function createCategory(
  dto: Pick<CategoryDto, "categoryName">,
): Promise<{ error?: string }> {
  try {
    await categoryService.create(dto);
    await revalidateProductData();
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function updateCategory(
  id: string,
  dto: Pick<CategoryDto, "categoryName">,
): Promise<{ error?: string }> {
  try {
    await categoryService.update(id, dto);
    await revalidateProductData();
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  try {
    await categoryService.delete(id);
    await revalidateProductData();
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}
