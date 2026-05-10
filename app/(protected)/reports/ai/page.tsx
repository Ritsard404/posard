import { getAppConfig } from "@/lib/app-config";
import { AiReportChat } from "./_components/AiReportChat";
import { aiReportQueryService } from "./_services/report-query.service";

export default async function AiReportsPage() {
  const config = getAppConfig();
  const context = await aiReportQueryService.loadPageContext();

  return (
    <AiReportChat
      isLiveReady={config.aiReport.ready}
      viewerRole={context.viewerRole}
      companies={context.companies}
      defaultCompanyId={context.defaultCompanyId}
    />
  );
}
