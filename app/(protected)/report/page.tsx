import { ReportsWorkspace } from "./_components/ReportsWorkspace";

export default function ReportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ReportsWorkspace searchParams={searchParams} />;
}
