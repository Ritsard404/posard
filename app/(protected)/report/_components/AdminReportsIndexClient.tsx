"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Search,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  const [isPending, startTransition] = useTransition();

  function updateQuery(next: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(next).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
        return;
      }

      params.set(key, value);
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const summary = useMemo(
    () => ({
      totalCompanies: pageData.totalCount,
      visibleTerminals: pageData.items.reduce(
        (sum, item) => sum + item.terminalCount,
        0,
      ),
      activeTerminals: pageData.items.reduce(
        (sum, item) => sum + item.activeTerminalCount,
        0,
      ),
    }),
    [pageData],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Companies" value={String(summary.totalCompanies)} icon={Building2} />
        <StatCard
          label="Visible Terminals"
          value={String(summary.visibleTerminals)}
          icon={Terminal}
        />
        <StatCard
          label="Active Terminals"
          value={String(summary.activeTerminals)}
          icon={BarChart3}
        />
      </div>

      <Card className="rounded-[30px] border-border/70 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Reports
              </span>
              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                Company-first reporting
              </span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Reports
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Start with a company, then drill into terminals and detailed report
                views without leaving the reporting hierarchy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-foreground">
            <CalendarDays className="size-4 text-muted-foreground" />
            Multi-company report access
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative">
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
                className="h-11 rounded-2xl pl-9"
              />
            </div>
            <Button
              type="button"
              className="h-11 rounded-2xl"
              disabled={isPending}
              onClick={() => updateQuery({ keyword: draftKeyword || null, page: "0" })}
            >
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl"
              disabled={isPending}
              onClick={() => {
                setDraftKeyword("");
                updateQuery({ keyword: null, page: "0", size: "10" });
              }}
            >
              Reset
            </Button>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
            Open a company to review all terminals, then drill down into a single device when needed.
          </div>
        </div>
      </Card>

      <div className="relative">
        {isPending ? <PendingOverlay /> : null}

        <Card
          className={cn(
            "overflow-hidden rounded-[30px] border-border/70 shadow-sm transition-opacity",
            isPending && "opacity-60",
          )}
        >
          {pageData.items.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-semibold">No companies found</p>
              <p className="text-sm text-muted-foreground">
                Adjust the search to find the reporting workspace you need.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-muted/35">
                    <tr className="border-b">
                      {["Company", "Manager", "Contact", "Terminals", "Created", "Actions"].map(
                        (label) => (
                          <th
                            key={label}
                            className={cn(
                              "px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                              label === "Actions" ? "text-right" : "",
                            )}
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.items.map((company) => (
                      <tr key={company.id} className="border-b align-top last:border-b-0">
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <div className="font-semibold tracking-tight">{company.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {company.email ?? "No email"}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium">{company.ownerManagerName ?? "Unassigned"}</div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {company.phone ?? "No phone"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold">{company.terminalCount}</div>
                          <div className="text-xs text-muted-foreground">
                            {company.activeTerminalCount} active
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {new Date(company.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
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

              <div className="grid gap-3 p-4 lg:hidden">
                {pageData.items.map((company) => (
                  <Card
                    key={company.id}
                    className="rounded-[24px] border-border/70 bg-background p-4 shadow-sm"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="font-semibold tracking-tight">{company.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {company.email ?? company.phone ?? "No contact info"}
                          </div>
                        </div>
                        <div className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          {company.terminalCount} terminals
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div className="rounded-2xl bg-muted/35 px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Manager
                          </div>
                          <div className="mt-1 font-medium text-foreground">
                            {company.ownerManagerName ?? "Unassigned"}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-muted/35 px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Active Terminals
                          </div>
                          <div className="mt-1 font-medium text-foreground">
                            {company.activeTerminalCount}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="ghost" className="h-10 rounded-2xl sm:flex-1" asChild>
                          <Link href={`/companies/${company.id}`}>Open Company</Link>
                        </Button>
                        <Button variant="outline" className="h-10 rounded-2xl sm:flex-1" asChild>
                          <Link href={`/companies/${company.id}/report`}>Company Reports</Link>
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
    </div>
  );
}

function PendingOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 rounded-[30px] bg-background/60 p-4 backdrop-blur-[1px]">
      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-[24px]" />
        ))}
      </div>
      <div className="hidden lg:block">
        <Skeleton className="h-[420px] rounded-[24px]" />
      </div>
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
    <Card className="rounded-[28px] border-border/70 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}
