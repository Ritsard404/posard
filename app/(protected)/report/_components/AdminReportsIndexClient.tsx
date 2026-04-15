"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Building2, CalendarDays, Search, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminPaginationControls } from "@/app/(protected)/companies/_components/AdminPaginationControls";
import type { ReportCompaniesWorkspaceDto } from "../_services/_dto/report.dto";

interface AdminReportsIndexClientProps {
  pageData: ReportCompaniesWorkspaceDto;
}

export function AdminReportsIndexClient({
  pageData,
}: AdminReportsIndexClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draftKeyword, setDraftKeyword] = useState(pageData.keyword);

  function updateQuery(next: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(next).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
        return;
      }

      params.set(key, value);
    });

    router.push(`${pathname}?${params.toString()}`);
  }

  const summary = useMemo(
    () => ({
      totalCompanies: pageData.totalCount,
      visibleTerminals: pageData.items.reduce((sum, item) => sum + item.terminalCount, 0),
      activeTerminals: pageData.items.reduce(
        (sum, item) => sum + item.activeTerminalCount,
        0,
      ),
    }),
    [pageData],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Companies" value={String(summary.totalCompanies)} icon={Building2} />
        <StatCard label="Visible Terminals" value={String(summary.visibleTerminals)} icon={Terminal} />
        <StatCard label="Active Terminals" value={String(summary.activeTerminals)} icon={BarChart3} />
      </div>

      <Card className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Start with a company, then drill into terminals and report views without leaving the reporting hierarchy.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            Company-first reporting
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draftKeyword}
                onChange={(event) => setDraftKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    updateQuery({ keyword: draftKeyword || null, page: "0" });
                  }
                }}
                placeholder="Search company name or email"
                className="pl-9"
              />
            </div>
            <Button type="button" onClick={() => updateQuery({ keyword: draftKeyword || null, page: "0" })}>
              Search
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraftKeyword("");
              updateQuery({ keyword: null, page: "0", size: "10" });
            }}
          >
            Reset
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden rounded-3xl">
        {pageData.items.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-semibold">No companies found</p>
            <p className="text-sm text-muted-foreground">Adjust the search to find the reporting workspace you need.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b">
                    {["Company", "Manager", "Contact", "Terminals", "Created", "Actions"].map((label) => (
                      <th key={label} className={`px-4 py-3 text-left font-medium text-muted-foreground ${label === "Actions" ? "text-right" : ""}`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.items.map((company) => (
                    <tr key={company.id} className="border-b align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{company.name}</div>
                        <div className="text-xs text-muted-foreground">{company.email ?? "No email"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{company.ownerManagerName ?? "Unassigned"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{company.phone ?? "No phone"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{company.terminalCount}</div>
                        <div className="text-xs text-muted-foreground">{company.activeTerminalCount} active</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(company.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/companies/${company.id}`}>Open Company</Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/companies/${company.id}/report`}>
                              <BarChart3 className="size-4" />
                              Company Reports
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {pageData.items.map((company) => (
                <Card key={company.id} className="rounded-2xl p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{company.name}</div>
                        <div className="text-xs text-muted-foreground">{company.email ?? company.phone ?? "No contact info"}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{company.terminalCount} terminals</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Manager: {company.ownerManagerName ?? "Unassigned"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/companies/${company.id}`}>Open Company</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/companies/${company.id}/report`}>Reports</Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <AdminPaginationControls
              page={pageData.page}
              size={pageData.size}
              totalCount={pageData.totalCount}
              totalPages={pageData.totalPages}
              onPageChange={(page) => updateQuery({ page: String(page) })}
              onSizeChange={(size) => updateQuery({ size: String(size), page: "0" })}
            />
          </>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="rounded-3xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
        <div className="rounded-2xl bg-muted p-3">
          <Icon className="size-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}
