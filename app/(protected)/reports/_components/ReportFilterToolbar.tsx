import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarDays,
  ChevronDown,
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
    <div className="rounded-2xl border border-border/70 bg-card px-3 py-3 shadow-sm sm:px-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((item) => (
              <Button
                key={item.id}
                asChild
                variant={preset === item.id ? "default" : "outline"}
                className={cn(
                  "h-9 rounded-xl px-3 text-sm",
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

          <form action={basePath} method="get" className="hidden gap-2 md:grid md:grid-cols-[minmax(140px,180px)_minmax(140px,180px)_auto]">
            {slug ? <input type="hidden" name="type" value={slug} /> : null}
            {companyId ? <input type="hidden" name="companyId" value={companyId} /> : null}
            {terminalId ? <input type="hidden" name="terminalId" value={terminalId} /> : null}
            <input type="hidden" name="preset" value="custom" />
            {canSort ? <input type="hidden" name="sortOrder" value={sortOrder} /> : null}
            <Input
              type="date"
              name="from"
              defaultValue={fromInput}
              className="h-9 rounded-xl text-sm"
              disabled={dateControlsDisabled}
            />
            <Input
              type="date"
              name="to"
              defaultValue={toInput}
              className="h-9 rounded-xl text-sm"
              disabled={dateControlsDisabled}
            />
            <Button type="submit" className="h-9 rounded-xl px-3 text-sm" disabled={dateControlsDisabled}>
              <CalendarDays className="size-4" />
              Apply Range
            </Button>
          </form>

          <details className="group rounded-xl border bg-muted/10 md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                Date Range
              </span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <form action={basePath} method="get" className="grid gap-2 border-t p-2">
              {slug ? <input type="hidden" name="type" value={slug} /> : null}
              {companyId ? <input type="hidden" name="companyId" value={companyId} /> : null}
              {terminalId ? <input type="hidden" name="terminalId" value={terminalId} /> : null}
              <input type="hidden" name="preset" value="custom" />
              {canSort ? <input type="hidden" name="sortOrder" value={sortOrder} /> : null}
              <Input
                type="date"
                name="from"
                defaultValue={fromInput}
                className="h-9 rounded-xl text-sm"
                disabled={dateControlsDisabled}
              />
              <Input
                type="date"
                name="to"
                defaultValue={toInput}
                className="h-9 rounded-xl text-sm"
                disabled={dateControlsDisabled}
              />
              <Button type="submit" className="h-9 rounded-xl px-3 text-sm" disabled={dateControlsDisabled}>
                <CalendarDays className="size-4" />
                Apply Range
              </Button>
            </form>
          </details>

          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
            {terminalOptions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-xl px-3 text-sm">
                    <MonitorSmartphone className="size-4" />
                    {terminalId
                      ? terminalOptions.find((item) => item.id === terminalId)?.name ?? "Selected terminal"
                      : "All terminals"}
                    <ArrowRightLeft className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 rounded-xl">
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
                  <Button variant="outline" className="h-9 rounded-xl px-3 text-sm">
                    <Clock3 className="size-4" />
                    {sortOrder === "oldest" ? "Oldest first" : "Newest first"}
                    <ArrowRightLeft className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 rounded-xl">
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
          <div className="grid gap-1.5 sm:flex-row xl:shrink-0 min-[420px]:grid-cols-2 xl:flex">
            <Button asChild variant="outline" className="h-9 rounded-xl px-3 text-sm">
              <Link href={`${exportBaseUrl}&format=csv`}>
                <Download className="size-4" />
                Export CSV
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-xl px-3 text-sm">
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
