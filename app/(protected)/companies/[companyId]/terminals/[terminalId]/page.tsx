import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { BarChart3, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyBackLink } from "@/app/(protected)/companies/[companyId]/_components/CompanyBackLink";
import { companyAccessService } from "@/app/(protected)/companies/[companyId]/_services/company-access.service";
import { companyService } from "@/app/(protected)/companies/[companyId]/_services/company.service";
import { terminalService } from "@/app/(protected)/companies/[companyId]/_services/terminal.service";
import TerminalWorkspaceClient from "./_components/TerminalWorkspaceClient";

interface TerminalWorkspacePageProps {
  params: Promise<{ companyId: string; terminalId: string }>;
}

export default async function TerminalWorkspacePage({
  params,
}: TerminalWorkspacePageProps) {
  await connection();

  const { companyId, terminalId } = await params;
  const [viewer, company, terminal] = await Promise.all([
    companyAccessService.assertCompanyAccess(companyId),
    companyService.getCompanyById(companyId),
    terminalService.getTerminalById(terminalId, companyId),
  ]);

  if (!company || !terminal) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CompanyBackLink
        href={`/companies/${companyId}/terminals`}
        label="Back to Terminal Workspace"
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Terminal className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {terminal.posName}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {viewer.role === "admin"
                ? `Terminal detail for ${company.name}.`
                : "Review this terminal and update its live configuration."}
            </p>
          </div>
        </div>

        {viewer.role === "admin" ? (
          <Button asChild variant="outline">
            <Link href={`/companies/${companyId}/terminals/${terminalId}/report`}>
              <BarChart3 className="size-4" />
              Terminal Reports
            </Link>
          </Button>
        ) : null}
      </div>

      <TerminalWorkspaceClient
        companyId={companyId}
        role={viewer.role}
        initialTerminal={terminal}
      />
    </div>
  );
}
