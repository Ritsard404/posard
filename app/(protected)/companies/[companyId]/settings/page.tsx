import { connection } from "next/server";
import { notFound } from "next/navigation";
import { companyService } from "../_services/company.service";
import SettingsPageClient from "./_components/SettingsPageClient";
import { Settings } from "lucide-react";

interface SettingsPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  await connection();
  const { companyId } = await params;
  const company = await companyService.getCompanyById(companyId);

  if (!company) notFound();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
          <Settings className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Company Settings</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage your company details and configuration.
          </p>
        </div>
      </div>

      <SettingsPageClient company={company} />
    </div>
  );
}
