import { remainingFeaturesService } from "../_services/remaining-features.service";
import { ManagementFilters, RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";
import { PromotionForm } from "../_components/ManagementForms";
import { createPromotionAction, transitionPromotionAction } from "../_actions/management-workflow.actions";
import { Button } from "@/components/ui/button";

interface PromotionsPageProps {
  searchParams?: Promise<{ search?: string; status?: string }>;
}

function promotionStatus(item: { isActive: boolean; ruleJson: unknown; endsAt: Date | null }) {
  if (item.endsAt && item.endsAt < new Date()) return "expired";
  if (item.isActive) return "active";
  if (typeof item.ruleJson === "object" && item.ruleJson && "status" in item.ruleJson) {
    return String((item.ruleJson as { status?: unknown }).status ?? "draft");
  }
  return "draft";
}

export default async function PromotionsPage({ searchParams }: PromotionsPageProps) {
  const filters = await searchParams;
  const promotions = await remainingFeaturesService.getPromotions(filters);

  return (
    <RemainingFeatureWorkspace
      title="Promotions Management"
      description="Create, schedule, activate, pause, duplicate, archive, and monitor promotion rules."
      toolbar={
        <div className="space-y-2">
          <ManagementFilters search={filters?.search} status={filters?.status} statuses={["draft", "active", "paused", "archived"]} />
          <PromotionForm action={createPromotionAction} />
        </div>
      }
      items={promotions}
      emptyText="No promotions recorded yet."
      columns={[
        { label: "Promotion", value: (item) => item.name },
        { label: "Type", value: (item) => <StatusBadge>{item.promotionType}</StatusBadge> },
        { label: "Value", value: (item) => Number(item.value) },
        { label: "Status", value: (item) => <StatusBadge>{promotionStatus(item)}</StatusBadge> },
        { label: "Schedule", value: (item) => `${item.startsAt?.toLocaleString() ?? "Now"} - ${item.endsAt?.toLocaleString() ?? "Open"}` },
        { label: "Redemptions", value: (item) => item._count.redemptions },
        {
          label: "Actions",
          value: (item) => (
            <form action={transitionPromotionAction} className="flex flex-wrap gap-1">
              <input type="hidden" name="promotionId" value={item.id} />
              {!item.isActive ? <Button size="sm" name="action" value="activate">Activate</Button> : null}
              {item.isActive ? <Button size="sm" variant="outline" name="action" value="pause">Pause</Button> : null}
              <Button size="sm" variant="outline" name="action" value="duplicate">Duplicate</Button>
              <Button size="sm" variant="outline" name="action" value="archive">Archive</Button>
            </form>
          ),
        },
      ]}
    />
  );
}
