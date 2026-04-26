import { connection } from "next/server";
import { CreditCard } from "lucide-react";
import { CompanyBackLink } from "../../_components/CompanyBackLink";
import { companyAccessService } from "../../_services/company-access.service";
import { saleTypeService } from "./_services/sale-type.service";
import SaleTypeManagementClient from "./_components/SaleTypeManagementClient";

interface SaleTypeManagementPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function SaleTypeManagementPage({
  params,
}: SaleTypeManagementPageProps) {
  await connection();
  const { companyId } = await params;

  await companyAccessService.assertCompanyAccess(companyId);
  const saleTypes = await saleTypeService.listReferencePaymentMethods();

  return (
    <div className="space-y-6">
      <CompanyBackLink href={`/companies/${companyId}/settings`} label="Back to Company Settings" />

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
          <CreditCard className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Sales Accounts</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage the reference payment methods that the POS checkout uses for non-cash transactions.
          </p>
        </div>
      </div>

      <SaleTypeManagementClient companyId={companyId} saleTypes={saleTypes} />
    </div>
  );
}
