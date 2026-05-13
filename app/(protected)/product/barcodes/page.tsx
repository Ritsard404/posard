import type { SearchParamsInput } from "@/app/(protected)/_lib/list-query";
import { parseStringParam } from "@/app/(protected)/_lib/list-query";
import { barcodeService } from "../_services/barcode.service";
import { parseProductListQuery } from "../_services/product-query";
import { BarcodeLabelPrintClient } from "./_components/BarcodeLabelPrintClient";

interface BarcodeLabelsPageProps {
  searchParams: Promise<SearchParamsInput>;
}

export default async function BarcodeLabelsPage({
  searchParams,
}: BarcodeLabelsPageProps) {
  const params = await searchParams;
  const ids = parseStringParam(params.ids)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const query = parseProductListQuery(params);

  const products = await barcodeService.listLabels({
    productIds: ids.length > 0 ? ids : undefined,
    keyword: ids.length > 0 ? undefined : query.keyword,
    categoryId: ids.length > 0 ? undefined : query.categoryId,
    barcodeStatus: "with",
  });

  return <BarcodeLabelPrintClient products={products} />;
}
