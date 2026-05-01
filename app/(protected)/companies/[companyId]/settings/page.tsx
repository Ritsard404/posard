import { connection } from "next/server";
import { redirect } from "next/navigation";
import { companyService } from "../_services/company.service";
import { companyAccessService } from "../_services/company-access.service";
import SettingsPageClient from "./_components/SettingsPageClient";
import { Settings } from "lucide-react";
import { CompanyBackLink } from "../_components/CompanyBackLink";

interface SettingsPageProps {
  params: Promise<{ companyId: string }>;
  searchParams?: Promise<{ view?: string }>;
}

export default async function SettingsPage({ params, searchParams }: SettingsPageProps) {
  await connection();
  try {
    const { companyId } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const [viewer, company] = await Promise.all([
      companyAccessService.assertCompanyAccess(companyId),
      companyService.getCompanyById(companyId),
    ]);
    const requestedView = resolvedSearchParams?.view;
    const initialView = requestedView === "vat" || requestedView === "business" ? requestedView : "business";

    if (!company) {
      redirect(`/companies/${companyId}`);
    }

    return (
      <div className="space-y-6">
        <CompanyBackLink href={`/companies/${companyId}`} label="Back to Company Details" />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
            <Settings className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Company Settings</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {viewer.role === "admin"
                ? "Manage company details, approval, and profile settings."
                : "Update your company details."}
            </p>
          </div>
        </div>

        <SettingsPageClient company={company} initialView={initialView} />
      </div>
    );
  } catch {
    const { companyId } = await params;
    redirect(`/companies/${companyId}`);
  }
}
