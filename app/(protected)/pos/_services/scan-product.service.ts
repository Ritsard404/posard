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
      const barcode = product.barcode?.trim().toLowerCase();
      const name = product.name.trim().toLowerCase();

      return barcode === normalizedValue || name === normalizedValue;
    }) ?? null
  );
}
