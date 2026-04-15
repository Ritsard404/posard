import { redirect } from "next/navigation";

interface CompanySettingAliasPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function CompanySettingAliasPage({
  params,
}: CompanySettingAliasPageProps) {
  const { companyId } = await params;
  redirect(`/companies/${companyId}/settings`);
}
