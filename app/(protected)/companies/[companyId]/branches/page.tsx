import { redirect } from "next/navigation";
import { CompanyBackLink } from "../_components/CompanyBackLink";
import { branchService } from "../_services/branch.service";
import { companyAccessService } from "../_services/company-access.service";
import { companyService } from "../_services/company.service";
import { BranchesPageClient } from "./_components/BranchesPageClient";

interface BranchesPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function BranchesPage({ params }: BranchesPageProps) {
  const { companyId } = await params;

  const [viewer, company, branches, managerOptions] = await Promise.all([
    companyAccessService.assertCompanyAccess(companyId),
    companyService.getCompanyById(companyId),
    branchService.getBranches(companyId),
    branchService.getManagerOptions(companyId),
  ]);

  if (!company) {
    redirect("/companies");
  }

  return (
    <div className="space-y-6">
      <CompanyBackLink
        href={`/companies/${companyId}`}
        label={`Back to ${viewer.role === "admin" ? "Company" : "My Company"}`}
      />
      <BranchesPageClient
        companyId={companyId}
        branches={branches}
        managerOptions={managerOptions}
      />
    </div>
  );
}
