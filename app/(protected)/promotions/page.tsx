import { remainingFeaturesService } from "../_services/remaining-features.service";
import { RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";

export default async function PromotionsPage() {
  const promotions = await remainingFeaturesService.getPromotions();

  return (
    <RemainingFeatureWorkspace
      title="Promotions"
      description="Structured promotion definitions with stackability, exclusivity, validity, and redemption counts."
      items={promotions}
      emptyText="No promotions recorded yet."
      columns={[
        { label: "Promotion", value: (item) => item.name },
        { label: "Type", value: (item) => <StatusBadge>{item.promotionType}</StatusBadge> },
        { label: "Value", value: (item) => Number(item.value) },
        { label: "Active", value: (item) => item.isActive ? "Yes" : "No" },
        { label: "Redemptions", value: (item) => item._count.redemptions },
      ]}
    />
  );
}
