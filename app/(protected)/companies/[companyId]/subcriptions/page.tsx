import { redirect } from "next/navigation";

interface CompanySubscriptionsAliasPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function CompanySubscriptionsAliasPage({
  params,
}: CompanySubscriptionsAliasPageProps) {
  const { companyId } = await params;
  redirect(`/companies/${companyId}/subscription`);
}

