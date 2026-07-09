import { redirect } from "next/navigation";
import { companyAccessService } from "../companies/[companyId]/_services/company-access.service";
import { AdminSubscriptionListQuerySchema } from "../companies/_services/_dto/admin-subscription.dto";
import { systemConfigurationService } from "../admin/_services/system-configuration.service";
import { adminCompanyService } from "../companies/_services/admin-company.service";
import { adminSubscriptionService } from "../companies/_services/admin-subscription.service";
import { GlobalSubscriptionsClient } from "./_components/GlobalSubscriptionsClient";

interface SubscriptionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  try {
    await companyAccessService.assertAdminAccess();
  } catch {
    redirect("/dashboard");
  }

  const rawSearchParams = await searchParams;
  const query = AdminSubscriptionListQuerySchema.parse({
    page: rawSearchParams.page,
    size: rawSearchParams.size,
    keyword: rawSearchParams.keyword,
    companyId: rawSearchParams.companyId,
    status: rawSearchParams.status,
    billingCycle: rawSearchParams.billingCycle,
  });

  const [pageData, companyOptions, config] = await Promise.all([
    adminSubscriptionService.getSubscriptionsPage(query),
    adminCompanyService.getCompanyOptions(),
    systemConfigurationService.get(),
  ]);

  return (
    <GlobalSubscriptionsClient
      pageData={pageData}
      companyOptions={companyOptions}
      platformBillingMode={config.platformBillingMode}
      keyword={query.keyword}
      status={query.status}
      billingCycle={query.billingCycle}
      companyId={query.companyId}
    />
  );
}
