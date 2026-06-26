export type RestockRiskLevel = "critical" | "high" | "medium" | "low";

export interface RestockRecommendationInput {
  id: string;
  name: string;
  categoryName: string | null;
  quantity: number;
  baseUnit: string;
  cost: number;
  price: number;
  soldQuantity: number;
  reorderPoint?: number | null;
  supplierName?: string | null;
}

export interface RestockRecommendationDto {
  id: string;
  name: string;
  categoryName: string;
  quantity: number;
  baseUnit: string;
  averageDailySales: number;
  remainingStockDays: number | null;
  recommendedReorderQuantity: number;
  riskLevel: RestockRiskLevel;
  supplierName: string | null;
  estimatedReorderCost: number;
  estimatedRetailValue: number;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function getRiskLevel(
  quantity: number,
  remainingStockDays: number | null,
  reorderPoint: number | null,
): RestockRiskLevel {
  if (quantity <= 0 || remainingStockDays === 0) {
    return "critical";
  }

  if (remainingStockDays !== null && remainingStockDays <= 3) {
    return "critical";
  }

  if (remainingStockDays !== null && remainingStockDays <= 7) {
    return "high";
  }

  if (remainingStockDays !== null && remainingStockDays <= 14) {
    return "medium";
  }

  return quantity <= (reorderPoint ?? 10) ? "medium" : "low";
}

export function buildRestockRecommendations(
  products: RestockRecommendationInput[],
  windowDays = 30,
): RestockRecommendationDto[] {
  return products
    .map((product) => {
      const averageDailySales = product.soldQuantity > 0 ? product.soldQuantity / windowDays : 0;
      const remainingStockDays =
        averageDailySales > 0 ? Math.max(0, product.quantity / averageDailySales) : null;
      const reorderTarget = product.reorderPoint ?? (averageDailySales > 0 ? Math.ceil(averageDailySales * 14) : 10);
      const recommendedReorderQuantity = Math.max(0, reorderTarget - Math.max(0, product.quantity));
      const riskLevel = getRiskLevel(product.quantity, remainingStockDays, product.reorderPoint ?? null);

      return {
        id: product.id,
        name: product.name,
        categoryName: product.categoryName ?? "Uncategorized",
        quantity: product.quantity,
        baseUnit: product.baseUnit || "units",
        averageDailySales: roundOne(averageDailySales),
        remainingStockDays: remainingStockDays === null ? null : roundOne(remainingStockDays),
        recommendedReorderQuantity,
        riskLevel,
        supplierName: product.supplierName ?? null,
        estimatedReorderCost: recommendedReorderQuantity * product.cost,
        estimatedRetailValue: recommendedReorderQuantity * product.price,
      };
    })
    .filter((item) => item.recommendedReorderQuantity > 0 || item.riskLevel !== "low")
    .sort((a, b) => {
      const riskOrder: Record<RestockRiskLevel, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };

      return (
        riskOrder[a.riskLevel] - riskOrder[b.riskLevel] ||
        (a.remainingStockDays ?? Number.POSITIVE_INFINITY) -
          (b.remainingStockDays ?? Number.POSITIVE_INFINITY) ||
        b.recommendedReorderQuantity - a.recommendedReorderQuantity ||
        a.name.localeCompare(b.name)
      );
    });
}
