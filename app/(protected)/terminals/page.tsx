import { redirect } from "next/navigation";
import { companyAccessService } from "../companies/[companyId]/_services/company-access.service";
import { AdminTerminalListQuerySchema } from "../companies/_services/_dto/admin-terminal.dto";
import { adminCompanyService } from "../companies/_services/admin-company.service";
import { adminTerminalService } from "../companies/_services/admin-terminal.service";
import { GlobalTerminalsClient } from "./_components/GlobalTerminalsClient";

interface TerminalsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TerminalsPage({ searchParams }: TerminalsPageProps) {
  try {
    await companyAccessService.assertAdminAccess();
  } catch {
    redirect("/dashboard");
  }

  const rawSearchParams = await searchParams;
  const query = AdminTerminalListQuerySchema.parse({
    page: rawSearchParams.page,
    size: rawSearchParams.size,
    keyword: rawSearchParams.keyword,
    companyId: rawSearchParams.companyId,
    status: rawSearchParams.status,
  });

  const [pageData, companyOptions] = await Promise.all([
    adminTerminalService.getTerminalsPage(query),
    adminCompanyService.getCompanyOptions(),
  ]);

  return (
    <GlobalTerminalsClient
      pageData={pageData}
      companyOptions={companyOptions}
      keyword={query.keyword}
      status={query.status}
      companyId={query.companyId}
    />
  );
}

