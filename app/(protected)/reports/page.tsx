import { ReportsOverviewPage } from "./_components/ReportsOverviewPage";
import { reportPageService } from "./_services/report-page.service";

interface ReportsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const data = await reportPageService.loadOverview(resolvedSearchParams);

  return <ReportsOverviewPage data={data} />;
}

