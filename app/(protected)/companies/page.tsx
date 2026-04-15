import { redirect } from "next/navigation";
import { companyAccessService } from "./[companyId]/_services/company-access.service";
import { CompanyAdminListQuerySchema } from "./_services/_dto/admin-company.dto";
import { adminCompanyService } from "./_services/admin-company.service";
import { CompanyManagementClient } from "./_components/CompanyManagementClient";

interface CompaniesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  let viewer;

  try {
    viewer = await companyAccessService.getViewer();
  } catch {
    redirect("/dashboard");
  }

  if (viewer.role !== "admin") {
    redirect(viewer.companyId ? `/companies/${viewer.companyId}` : "/dashboard");
  }

  const rawSearchParams = await searchParams;
  const query = CompanyAdminListQuerySchema.parse({
    page: rawSearchParams.page,
    size: rawSearchParams.size,
    keyword: rawSearchParams.keyword,
  });

  const pageData = await adminCompanyService.getCompaniesPage(query);

  return (
    <CompanyManagementClient
      title="Companies"
      description="Manage company records and jump directly into terminals, subscriptions, and settings."
      pageData={pageData}
      keyword={query.keyword}
    />
  );
}
