import type { Metadata } from "next";

import type { SearchParamsInput } from "@/app/(protected)/_lib/list-query";
import { createProtectedPageMetadata } from "@/lib/seo";
import { InventoryPageClient } from "./_components/InventoryPageClient";
import { getCachedInventoryPageData } from "@/app/(protected)/product/_services/product-cache";
import {
  parseProductListQuery,
  type ProductListQuery,
} from "@/app/(protected)/product/_services/product-query";

interface InventoryPageProps {
  searchParams: Promise<SearchParamsInput>;
}

export const metadata: Metadata = createProtectedPageMetadata("inventory");

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const query: ProductListQuery = parseProductListQuery(await searchParams);
  const { initialProducts, initialCategories } =
    await getCachedInventoryPageData(query);

  return (
    <InventoryPageClient
      initialProducts={initialProducts}
      initialCategories={initialCategories}
      query={query}
    />
  );
}
