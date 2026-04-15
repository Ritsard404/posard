import { notFound } from "next/navigation";
import { CompanyBackLink } from "@/app/(protected)/companies/[companyId]/_components/CompanyBackLink";
import { ReportDetailWorkspace } from "@/app/(protected)/report/_components/ReportDetailWorkspace";
import { getReportTerminalContextAction } from "@/app/(protected)/report/_actions/report.action";
import { reportAccessService } from "@/app/(protected)/report/_services/report-access.service";

interface TerminalReportPageProps {
  params: Promise<{ companyId: string; terminalId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TerminalReportPage({
  params,
  searchParams,
}: TerminalReportPageProps) {
  const { companyId, terminalId } = await params;
  const viewer = await reportAccessService.getViewer();

  if (viewer.role !== "admin") {
    notFound();
  }

  const contextResult = await getReportTerminalContextAction({
    companyId,
    terminalId,
  });

  if (!contextResult.success) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CompanyBackLink
        href={`/companies/${companyId}/report`}
        label="Back to Company Reports"
      />

      <ReportDetailWorkspace
        searchParams={searchParams}
        basePath={`/companies/${companyId}/terminals/${terminalId}/report`}
        companyId={companyId}
        terminalId={terminalId}
        companyName={contextResult.data.companyName}
        terminalName={contextResult.data.terminalName}
        workspaceLabel="Terminal Reports"
        workspaceDescription="This view is locked to one terminal so report totals and print actions always map to the selected device."
        scopeBadgeLabel={contextResult.data.terminalName}
        showTerminalScopeSwitcher={false}
      />
    </div>
  );
}
