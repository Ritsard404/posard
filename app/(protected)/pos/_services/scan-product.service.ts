import type { Product } from "../_store/pos-store";

export function normalizeScanValue(value: string): string {
  return value.trim();
}

export function findProductByScanValue(
  products: Product[],
  value: string,
): Product | null {
  const normalizedValue = normalizeScanValue(value).toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  return (
    products.find((product) => {
      const exactFields = [
        product.barcode,
        product.name,
        product.genericName,
        product.brandName,
      ]
        .map((field) => field?.trim().toLowerCase())
        .filter(Boolean);

      return exactFields.includes(normalizedValue);
    }) ?? null
  );
}
