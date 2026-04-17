import {
  parseIntegerParam,
  parseStringParam,
  type SearchParamsInput,
} from "@/app/(protected)/_lib/list-query";

export const PRODUCT_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const PRODUCT_QUERY_DEFAULTS = {
  page: 0,
  size: 10,
  keyword: "",
  categoryId: null as string | null,
};

export interface ProductListQuery {
  page: number;
  size: number;
  keyword: string;
  categoryId: string | null;
}

export function parseProductListQuery(
  searchParams: SearchParamsInput,
): ProductListQuery {
  const categoryId = parseStringParam(searchParams.categoryId);
  const keyword = parseStringParam(searchParams.keyword);

  return {
    page: parseIntegerParam(searchParams.page, PRODUCT_QUERY_DEFAULTS.page, {
      min: 0,
    }),
    size: parseIntegerParam(searchParams.size, PRODUCT_QUERY_DEFAULTS.size, {
      min: 1,
      allowed: [...PRODUCT_PAGE_SIZE_OPTIONS],
    }),
    keyword,
    categoryId: categoryId || null,
  };
}
