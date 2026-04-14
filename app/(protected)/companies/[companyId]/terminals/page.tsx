import { connection } from "next/server";
import { Terminal } from "lucide-react";
import TerminalsPageClient from "./_components/TerminalsPageClient";
import { companyAccessService } from "../_services/company-access.service";
import { CompanyBackLink } from "../_components/CompanyBackLink";

interface TerminalsPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function TerminalsPage({ params }: TerminalsPageProps) {
  await connection();
  const { companyId } = await params;
  const viewer = await companyAccessService.assertCompanyAccess(companyId);

  return (
    <div className="space-y-6">
      <CompanyBackLink href={`/companies/${companyId}`} label="Back to Company Details" />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <Terminal className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Terminals</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {viewer.role === "admin"
              ? "Manage POS terminals and review manager requests."
              : "View company terminals and request additional devices."}
          </p>
        </div>
      </div>

      <TerminalsPageClient companyId={companyId} role={viewer.role} />
    </div>
  );
}
