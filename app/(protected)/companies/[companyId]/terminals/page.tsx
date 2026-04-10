import { connection } from "next/server";
import { Terminal } from "lucide-react";
import TerminalsPageClient from "./_components/TerminalsPageClient";

interface TerminalsPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function TerminalsPage({ params }: TerminalsPageProps) {
  await connection();
  const { companyId } = await params;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <Terminal className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Terminals</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage POS terminals for this company.
          </p>
        </div>
      </div>

      {/* Client interaction layer */}
      <TerminalsPageClient companyId={companyId} />
    </div>
  );
}
