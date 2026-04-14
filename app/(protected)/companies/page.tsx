import { redirect } from "next/navigation";
import { companyService } from "./[companyId]/_services/company.service";
import { CompanyListClient } from "./_components/CompanyListClient";
import { companyAccessService } from "./[companyId]/_services/company-access.service";

export default async function CompaniesPage() {
  let viewer;

  try {
    viewer = await companyAccessService.getViewer();
  } catch {
    redirect("/dashboard");
  }

  if (viewer.role !== "admin") {
    redirect(viewer.companyId ? `/companies/${viewer.companyId}` : "/dashboard");
  }

  const companies = await companyService.getCompanies();

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 -left-10 w-96 h-96 bg-accent/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none"></div>
      <div className="absolute top-20 -right-10 w-96 h-96 bg-emerald-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute -bottom-20 left-40 w-96 h-96 bg-indigo-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000 pointer-events-none"></div>

      <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Page header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-heading font-extrabold tracking-tight">Companies</h1>
          <p className="text-muted-foreground font-medium">Manage all merchant profiles and organizational settings</p>
        </div>

        {/* Company list */}
        <CompanyListClient initialCompanies={companies} />
      </div>
    </div>
  );
}
