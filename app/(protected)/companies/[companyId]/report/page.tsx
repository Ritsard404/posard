import { notFound } from "next/navigation";
import { CompanyBackLink } from "../_components/CompanyBackLink";
import { ReportDetailWorkspace } from "@/app/(protected)/report/_components/ReportDetailWorkspace";
import { getReportCompanyContextAction } from "@/app/(protected)/report/_actions/report.action";
import { reportAccessService } from "@/app/(protected)/report/_services/report-access.service";

interface CompanyReportPageProps {
  params: Promise<{ companyId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CompanyReportPage({
  params,
  searchParams,
}: CompanyReportPageProps) {
  const { companyId } = await params;
  const viewer = await reportAccessService.getViewer();

  if (viewer.role !== "admin") {
    notFound();
  }

  const contextResult = await getReportCompanyContextAction({ companyId });

  if (!contextResult.success) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CompanyBackLink href={`/companies/${companyId}`} label="Back to Company Details" />

      <ReportDetailWorkspace
        searchParams={searchParams}
        basePath={`/companies/${companyId}/report`}
        companyId={companyId}
        companyName={contextResult.data.companyName}
        workspaceLabel="Company Reports"
        workspaceDescription="Company-wide reports aggregate all terminals by default. Drill into a terminal below for device-specific views."
        scopeBadgeLabel="All terminals"
        showTerminalScopeSwitcher={false}
        showTerminalDrilldown
        terminalReportBasePath={`/companies/${companyId}/terminals`}
      />
    </div>
  );
}
