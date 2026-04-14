import { DashboardScreen } from "./_components/DashboardScreen";
import { dashboardService } from "./_services/dashboard.service";

export default async function DashboardPage() {
  try {
    const dashboard = await dashboardService.getDashboard();
    return <DashboardScreen dashboard={dashboard} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard.";

    return (
      <div className="rounded-3xl border border-border/60 bg-background p-6">
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }
}
