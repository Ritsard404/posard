import { connection } from "next/server";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { CompanyBackLink } from "../_components/CompanyBackLink";
import { companyAccessService } from "../_services/company-access.service";
import SubscriptionPageClient from "./_components/SubscriptionPageClient";

interface SubscriptionPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function SubscriptionPage({ params }: SubscriptionPageProps) {
  await connection();
  const { companyId } = await params;
  const viewer = await companyAccessService.assertCompanyAccess(companyId);

  if (viewer.role !== "admin") {
    redirect(`/companies/${companyId}`);
  }

  return (
    <div className="space-y-6">
      <CompanyBackLink href={`/companies/${companyId}`} label="Back to Company Details" />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Subscription</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage billing, renewal dates, and status per terminal.
          </p>
        </div>
      </div>

      <SubscriptionPageClient companyId={companyId} />
    </div>
  );
}
