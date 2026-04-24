import { redirect } from "next/navigation";

interface PwdSeniorPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PwdSeniorPage({ searchParams }: PwdSeniorPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const params = new URLSearchParams();

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    const resolved = Array.isArray(value) ? value[0] : value;
    if (!resolved) {
      return;
    }

    params.set(key, resolved);
  });

  redirect(`/reports/discounts${params.toString() ? `?${params.toString()}` : ""}`);
}
