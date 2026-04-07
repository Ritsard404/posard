"use server";

import { categoryService } from "@/app/(protected)/inventory/_services/category.service";
import type { CategoryDto } from "@/app/(protected)/inventory/_services/_dto/category.dto";

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
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  try {
    await categoryService.delete(id);
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}
