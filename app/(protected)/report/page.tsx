import { redirect } from "next/navigation";
import { getSlugForPrintableView } from "@/app/(protected)/reports/_components/reports-config";

export default function ReportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return LegacyReportRedirect({ searchParams });
}

async function LegacyReportRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = (await searchParams) ?? {};
  const view = Array.isArray(rawSearchParams.view) ? rawSearchParams.view[0] : rawSearchParams.view;
  const slug = getSlugForPrintableView(view);
  const params = new URLSearchParams();

  Object.entries(rawSearchParams).forEach(([key, value]) => {
    const resolved = Array.isArray(value) ? value[0] : value;
    if (!resolved || key === "view") {
      return;
    }

    params.set(key, resolved);
  });

  if (!slug) {
    redirect(`/reports${params.toString() ? `?${params.toString()}` : ""}`);
  }

  redirect(`/reports/${slug}${params.toString() ? `?${params.toString()}` : ""}`);
}
