import { debtListFiltersSchema } from "./_services/debt.dto";
import { debtService } from "./_services/debt.service";
import { DebtsPageClient } from "./_components/DebtsPageClient";

export default async function DebtsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters = debtListFiltersSchema.parse({
    status: typeof params.status === "string" ? params.status : undefined,
    customerId: typeof params.customerId === "string" ? params.customerId : undefined,
    terminalId: typeof params.terminalId === "string" ? params.terminalId : undefined,
    query: typeof params.query === "string" ? params.query : "",
  });
  const workspace = await debtService.getWorkspace(filters);

  return <DebtsPageClient initialData={workspace} initialFilters={filters} />;
}
