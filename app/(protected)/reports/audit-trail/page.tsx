import { ReportDirectPage } from "../_components/ReportDirectPage";
import { reportPageService } from "../_services/report-page.service";

interface AuditTrailPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuditTrailPage({
  searchParams,
}: AuditTrailPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const data = await reportPageService.loadReportPage(
    "audit-trail",
    resolvedSearchParams,
  );

  return <ReportDirectPage data={data} />;
}
