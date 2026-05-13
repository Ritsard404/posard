import "server-only";

import { unstable_cache } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { categoryService } from "@/app/(protected)/product/_services/category.service";
import { productService } from "@/app/(protected)/product/_services/product.service";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";
import type {
  PageResponse,
  ProductDto,
} from "@/app/(protected)/product/_services/_dto/product.dto";
import type { ProductListQuery } from "@/app/(protected)/product/_services/product-query";

export const PRODUCT_CACHE_REVALIDATE_SECONDS = 60;

function getCompanyCacheScope(companyId: string | null) {
  return companyId ?? "public";
}

export function getProductListTag(companyId: string | null) {
  return `product:list:${getCompanyCacheScope(companyId)}`;
}

export function getProductCategoriesTag(companyId: string | null) {
  return `product:categories:${getCompanyCacheScope(companyId)}`;
}

function getCachedProducts(
  companyId: string | null,
  query: ProductListQuery,
): Promise<PageResponse<ProductDto>> {
  const cacheKey = [
    "product-list",
    getCompanyCacheScope(companyId),
    query.keyword || "__all__",
    query.categoryId || "__all__",
    query.barcodeStatus,
    String(query.page),
    String(query.size),
  ];

  return unstable_cache(
    async () =>
      productService.findAllForCompany(companyId, {
        keyword: query.keyword || undefined,
        categoryId: query.categoryId ?? undefined,
        barcodeStatus: query.barcodeStatus,
        page: query.page,
        size: query.size,
      }),
    cacheKey,
    {
      revalidate: PRODUCT_CACHE_REVALIDATE_SECONDS,
      tags: [getProductListTag(companyId)],
    },
  )();
}

function getCachedCategories(companyId: string | null): Promise<CategoryDto[]> {
  return unstable_cache(
    async () => categoryService.findAllByCompanyId(companyId),
    ["product-categories", getCompanyCacheScope(companyId)],
    {
      revalidate: PRODUCT_CACHE_REVALIDATE_SECONDS,
      tags: [getProductCategoriesTag(companyId)],
    },
  )();
}

export async function getCachedInventoryPageData(query: ProductListQuery) {
  const companyId = (await getCurrentProfile())?.companyId ?? null;

  const [initialProducts, initialCategories] = await Promise.all([
    getCachedProducts(companyId, query),
    getCachedCategories(companyId),
  ]);

  return {
    initialProducts,
    initialCategories,
  };
}
