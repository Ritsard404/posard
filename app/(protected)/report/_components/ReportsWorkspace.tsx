import { ReportDetailWorkspace } from "./ReportDetailWorkspace";

type SearchParams = Record<string, string | string[] | undefined>;

export async function ReportsWorkspace({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  return <ReportDetailWorkspace searchParams={searchParams} />;
}
