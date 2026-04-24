import { ReportDirectPage } from "../_components/ReportDirectPage";
import { reportPageService } from "../_services/report-page.service";

interface ReportTypePageProps {
  params: Promise<{ reportType: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReportTypePage({
  params,
  searchParams,
}: ReportTypePageProps) {
  const { reportType } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const data = await reportPageService.loadReportPage(reportType, resolvedSearchParams);

  return <ReportDirectPage data={data} />;
}

