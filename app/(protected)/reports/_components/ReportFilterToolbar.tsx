import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarDays,
  Clock3,
  Download,
  FileSpreadsheet,
  MonitorSmartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ReportPreset, ReportsRouteSlug } from "./reports-config";
import {
  supportsReportSort,
  type ReportPrintableView,
  type ReportSortOrder,
} from "@/app/(protected)/report/_components/report-workspace-config";

export function ReportFilterToolbar({
  basePath,
  slug,
  preset,
  fromInput,
  toInput,
  companyId,
  terminalId,
  exportBaseUrl,
  terminalOptions = [],
  dateControlsDisabled = false,
  dateHint,
  view,
  sortOrder = "newest",
}: {
  basePath: string;
  slug?: ReportsRouteSlug;
  preset: ReportPreset;
  fromInput: string;
  toInput: string;
  companyId?: string | null;
  terminalId?: string | null;
  exportBaseUrl?: string;
  terminalOptions?: Array<{ id: string; name: string; isActive: boolean }>;
  dateControlsDisabled?: boolean;
  dateHint?: string;
  view?: ReportPrintableView;
  sortOrder?: ReportSortOrder;
}) {
  const presets: Array<{ id: ReportPreset; label: string }> = [
    { id: "today", label: "Today" },
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "all", label: "All" },
  ];
  const canSort = view ? supportsReportSort(view) : false;

  return (
    <div className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((item) => (
              <Button
                key={item.id}
                asChild
                variant={preset === item.id ? "default" : "outline"}
                className={cn(
                  "h-11 rounded-2xl",
                  preset === item.id && "shadow-sm",
                  dateControlsDisabled && item.id !== "all" && "pointer-events-none opacity-50",
                )}
              >
                <Link href={buildFilterHref(basePath, item.id, companyId, terminalId, sortOrder)}>
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>

          {dateHint ? (
            <div className="text-sm text-muted-foreground">{dateHint}</div>
          ) : null}

          <form action={basePath} method="get" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            {slug ? <input type="hidden" name="type" value={slug} /> : null}
            {companyId ? <input type="hidden" name="companyId" value={companyId} /> : null}
            {terminalId ? <input type="hidden" name="terminalId" value={terminalId} /> : null}
            <input type="hidden" name="preset" value="custom" />
            {canSort ? <input type="hidden" name="sortOrder" value={sortOrder} /> : null}
            <Input
              type="date"
              name="from"
              defaultValue={fromInput}
              className="h-11 rounded-2xl"
              disabled={dateControlsDisabled}
            />
            <Input
              type="date"
              name="to"
              defaultValue={toInput}
              className="h-11 rounded-2xl"
              disabled={dateControlsDisabled}
            />
            <Button type="submit" className="h-11 rounded-2xl" disabled={dateControlsDisabled}>
              <CalendarDays className="size-4" />
              Apply Range
            </Button>
          </form>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {terminalOptions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11 rounded-2xl">
                    <MonitorSmartphone className="size-4" />
                    {terminalId
                      ? terminalOptions.find((item) => item.id === terminalId)?.name ?? "Selected terminal"
                      : "All terminals"}
                    <ArrowRightLeft className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 rounded-2xl">
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href={buildFilterHref(basePath, preset, companyId, null, sortOrder)}>
                      <MonitorSmartphone className="size-4" />
                      <span className="flex-1">All terminals</span>
                    </Link>
                  </DropdownMenuItem>
                  {terminalOptions.map((item) => (
                    <DropdownMenuItem key={item.id} asChild className="rounded-xl">
                      <Link href={buildFilterHref(basePath, preset, companyId, item.id, sortOrder)}>
                        <MonitorSmartphone className="size-4" />
                        <span className="flex-1">{item.name}</span>
                        {item.isActive ? (
                          <span className="text-xs text-muted-foreground">Live</span>
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {canSort ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11 rounded-2xl">
                    <Clock3 className="size-4" />
                    {sortOrder === "oldest" ? "Oldest first" : "Newest first"}
                    <ArrowRightLeft className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 rounded-2xl">
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href={buildFilterHref(basePath, preset, companyId, terminalId, "newest")}>
                      <Clock3 className="size-4" />
                      <span className="flex-1">Newest first</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href={buildFilterHref(basePath, preset, companyId, terminalId, "oldest")}>
                      <Clock3 className="size-4" />
                      <span className="flex-1">Oldest first</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {exportBaseUrl ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="h-11 rounded-2xl">
              <Link href={`${exportBaseUrl}&format=csv`}>
                <Download className="size-4" />
                Export CSV
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-2xl">
              <Link href={`${exportBaseUrl}&format=xlsx`}>
                <FileSpreadsheet className="size-4" />
                Export XLSX
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildFilterHref(
  basePath: string,
  preset: ReportPreset,
  companyId?: string | null,
  terminalId?: string | null,
  sortOrder?: ReportSortOrder,
) {
  const params = new URLSearchParams({ preset });

  if (companyId) params.set("companyId", companyId);
  if (terminalId) params.set("terminalId", terminalId);
  if (sortOrder) params.set("sortOrder", sortOrder);

  return `${basePath}?${params.toString()}`;
}
