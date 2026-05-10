import { redirect } from "next/navigation";
import { accountsAccessService } from "@/app/(protected)/accounts/_services/accounts-access.service";
import { systemConfigurationService } from "../_services/system-configuration.service";
import { SystemSettingsClient } from "../_components/SystemSettingsClient";

export default async function AdminSettingsPage() {
  const viewer = await accountsAccessService.getViewer().catch(() => null);

  if (viewer?.role !== "admin") {
    redirect("/dashboard");
  }

  const config = await systemConfigurationService.get();

  return <SystemSettingsClient initialConfig={config} />;
}
