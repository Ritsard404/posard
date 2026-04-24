import { redirect } from "next/navigation";
import { getSlugForPrintableView } from "@/app/(protected)/reports/_components/reports-config";

interface CompanyReportPageProps {
  params: Promise<{ companyId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CompanyReportPage({
  params,
  searchParams,
}: CompanyReportPageProps) {
  const { companyId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const view = Array.isArray(resolvedSearchParams.view)
    ? resolvedSearchParams.view[0]
    : resolvedSearchParams.view;
  const slug = getSlugForPrintableView(view) ?? "sales";
  const query = new URLSearchParams({ companyId });

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    const resolved = Array.isArray(value) ? value[0] : value;
    if (!resolved || key === "view") {
      return;
    }

    query.set(key, resolved);
  });

  redirect(`/reports/${slug}?${query.toString()}`);
}
