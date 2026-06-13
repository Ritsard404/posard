import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import TerminalsPageClient from "./_components/TerminalsPageClient";
import { companyAccessService } from "../_services/company-access.service";
import { CompanyBackLink } from "../_components/CompanyBackLink";
import { branchService } from "../_services/branch.service";

interface TerminalsPageProps {
  params: Promise<{ companyId: string }>;
  searchParams?: Promise<{ view?: string }>;
}

export default async function TerminalsPage({ params, searchParams }: TerminalsPageProps) {
  await connection();
  try {
    const { companyId } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const [viewer, branches] = await Promise.all([
      companyAccessService.assertCompanyAccess(companyId),
      branchService.getBranches(companyId),
    ]);
    const requestedView = resolvedSearchParams?.view;
    const initialView =
      requestedView === "terminal" || requestedView === "printer" || requestedView === "list"
        ? requestedView
        : "list";

    return (
      <div className="space-y-6">
        <CompanyBackLink href={`/companies/${companyId}`} label="Back to Company Details" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Terminal className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Terminals</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {viewer.role === "admin"
                  ? "Manage POS terminals and review manager requests."
                  : "View company terminals and request additional devices."}
              </p>
            </div>
          </div>

          <Button asChild variant="outline">
            <Link href={`/companies/${companyId}/report`}>
              <BarChart3 className="size-4" />
              Company Reports
            </Link>
          </Button>
        </div>

        <TerminalsPageClient
          companyId={companyId}
          role={viewer.role}
          initialView={initialView}
          branchOptions={branches.filter((branch) => branch.isActive).map((branch) => ({
            id: branch.id,
            name: branch.name,
          }))}
        />
      </div>
    );
  } catch {
    const { companyId } = await params;
    redirect(`/companies/${companyId}`);
  }
}
