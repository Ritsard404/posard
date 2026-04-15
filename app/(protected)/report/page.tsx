import { redirect } from "next/navigation";
import { getAdminReportCompaniesAction } from "./_actions/report.action";
import { AdminReportsIndexClient } from "./_components/AdminReportsIndexClient";
import { ReportsWorkspace } from "./_components/ReportsWorkspace";
import { reportAccessService } from "./_services/report-access.service";

export default function ReportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ReportPageContent searchParams={searchParams} />;
}

async function ReportPageContent({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await reportAccessService.getViewer();

  if (viewer.role !== "admin") {
    return <ReportsWorkspace searchParams={searchParams} />;
  }

  const rawSearchParams = (await searchParams) ?? {};
  const page = Array.isArray(rawSearchParams.page) ? rawSearchParams.page[0] : rawSearchParams.page;
  const size = Array.isArray(rawSearchParams.size) ? rawSearchParams.size[0] : rawSearchParams.size;
  const keyword = Array.isArray(rawSearchParams.keyword)
    ? rawSearchParams.keyword[0]
    : rawSearchParams.keyword;
  const result = await getAdminReportCompaniesAction({
    page,
    size,
    keyword,
  });

  if (!result.success) {
    redirect("/dashboard");
  }

  return <AdminReportsIndexClient pageData={result.data} />;
}
