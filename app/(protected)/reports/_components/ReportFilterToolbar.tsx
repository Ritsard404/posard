import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  Download,
  FileSpreadsheet,
  MonitorSmartphone,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { cn } from "@/lib/utils";
import type { ReportPeriod, ReportPreset, ReportsRouteSlug } from "./reports-config";
import type { InvoiceDocumentItemDto } from "@/app/(protected)/report/_services/_dto/report.dto";
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
  period = "daily",
  companyId,
  terminalId,
  exportBaseUrl,
  terminalOptions = [],
  dateControlsDisabled = false,
  dateHint,
  view,
  sortOrder = "newest",
  showPeriodTabs = true,
  documentType = "all",
  trainMode = "all",
  documentMode = false,
  keyword = "",
}: {
  basePath: string;
  slug?: ReportsRouteSlug;
  preset: ReportPreset;
  fromInput: string;
  toInput: string;
  period?: ReportPeriod;
  companyId?: string | null;
  terminalId?: string | null;
  exportBaseUrl?: string;
  terminalOptions?: Array<{ id: string; name: string; isActive: boolean }>;
  dateControlsDisabled?: boolean;
  dateHint?: string;
  view?: ReportPrintableView;
  sortOrder?: ReportSortOrder;
  showPeriodTabs?: boolean;
  documentType?: InvoiceDocumentItemDto["type"] | "all";
  trainMode?: "all" | "training" | "live";
  documentMode?: boolean;
  keyword?: string;
}) {
  const presets: Array<{ id: ReportPreset; label: string }> = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "7d", label: "Last 7 days" },
    { id: "30d", label: "Last 30 days" },
    { id: "thisMonth", label: "This Month" },
    { id: "lastMonth", label: "Last Month" },
  ];
  const periods: Array<{ id: ReportPeriod; label: string; preset: ReportPreset }> = [
    { id: "daily", label: "Daily", preset: "today" },
    { id: "weekly", label: "Weekly", preset: "7d" },
    { id: "monthly", label: "Monthly", preset: "thisMonth" },
    { id: "annual", label: "Annual", preset: "thisYear" },
  ];
  const canSort = view ? supportsReportSort(view) : false;
  const canSearchInvoiceTrace =
    view === "transactions" ||
    view === "transaction-list" ||
    view === "invoice-documents";
  const activeTerminalLabel = terminalId
    ? terminalOptions.find((item) => item.id === terminalId)?.name ?? "Selected terminal"
    : "All terminals";
  const activePresetLabel =
    presets.find((item) => item.id === preset)?.label ?? "Custom Range";
  const documentTypes: Array<{ id: InvoiceDocumentItemDto["type"] | "all"; label: string }> = [
    { id: "all", label: "All documents" },
    { id: "INVOICE", label: "Invoices" },
    { id: "XREPORT", label: "X-Reports" },
    { id: "ZREPORT", label: "Z-Reports" },
  ];
  const trainModes: Array<{ id: "all" | "training" | "live"; label: string }> = [
    { id: "all", label: "All modes" },
    { id: "live", label: "Live only" },
    { id: "training", label: "Train mode" },
  ];
  const activeDocumentTypeLabel =
    documentTypes.find((item) => item.id === documentType)?.label ?? "All documents";
  const activeTrainModeLabel =
    trainModes.find((item) => item.id === trainMode)?.label ?? "All modes";

  return (
    <>
      <HeaderActions>
        <div className="flex min-w-max items-center justify-end gap-1.5">
          {!documentMode ? (
          <div className="hidden items-center gap-1 2xl:flex">
            {presets.map((item) => (
              <Button
                key={item.id}
                asChild
                variant={preset === item.id ? "default" : "outline"}
                className={cn(
                  "h-8 rounded-full px-3 text-xs font-semibold",
                  preset === item.id && "shadow-sm",
                  dateControlsDisabled && "pointer-events-none opacity-50",
                )}
              >
                <Link
                  href={buildFilterHref({
                    basePath,
                    preset: item.id,
                    period: getPeriodForPreset(item.id, period),
                    companyId,
                    terminalId,
                    sortOrder,
                  })}
                >
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
          ) : null}

          {!documentMode ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 rounded-xl px-3 text-sm 2xl:hidden">
                <CalendarDays className="size-4" />
                <span>{activePresetLabel}</span>
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              {presets.map((item) => (
                <DropdownMenuItem key={item.id} asChild className="rounded-xl">
                  <Link
                    href={buildFilterHref({
                      basePath,
                      preset: item.id,
                      period: getPeriodForPreset(item.id, period),
                      companyId,
                      terminalId,
                      sortOrder,
                    })}
                  >
                    <CalendarDays className="size-4" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          ) : null}

          {!documentMode ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 rounded-xl px-3 text-sm">
                <CalendarDays className="size-4" />
                <span className="capitalize">{period}</span>
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl">
              {periods.map((item) => (
                <DropdownMenuItem key={item.id} asChild className="rounded-xl">
                  <Link
                    href={buildFilterHref({
                      basePath,
                      preset: item.preset,
                      period: item.id,
                      companyId,
                      terminalId,
                      sortOrder,
                    })}
                  >
                    <CalendarDays className="size-4" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          ) : null}

          {documentMode ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-xl px-3 text-sm">
                    <FileSpreadsheet className="size-4" />
                    <span>{activeDocumentTypeLabel}</span>
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  {documentTypes.map((item) => (
                    <DropdownMenuItem key={item.id} asChild className="rounded-xl">
                      <Link
                        href={buildFilterHref({
                          basePath,
                          preset,
                          period,
                          companyId,
                          terminalId,
                          sortOrder,
                          documentType: item.id,
                          trainMode,
                        })}
                      >
                        <FileSpreadsheet className="size-4" />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-xl px-3 text-sm">
                    <MonitorSmartphone className="size-4" />
                    <span>{activeTrainModeLabel}</span>
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                  {trainModes.map((item) => (
                    <DropdownMenuItem key={item.id} asChild className="rounded-xl">
                      <Link
                        href={buildFilterHref({
                          basePath,
                          preset,
                          period,
                          companyId,
                          terminalId,
                          sortOrder,
                          documentType,
                          trainMode: item.id,
                        })}
                      >
                        <MonitorSmartphone className="size-4" />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}

          <form
            action={basePath}
            method="get"
            className="hidden grid-cols-[8.75rem_8.75rem_auto] gap-1.5 lg:grid"
          >
            {slug ? <input type="hidden" name="type" value={slug} /> : null}
            {companyId ? <input type="hidden" name="companyId" value={companyId} /> : null}
            {terminalId ? <input type="hidden" name="terminalId" value={terminalId} /> : null}
            <input type="hidden" name="preset" value="custom" />
            <input type="hidden" name="period" value={period} />
            {canSort ? <input type="hidden" name="sortOrder" value={sortOrder} /> : null}
            {keyword ? <input type="hidden" name="keyword" value={keyword} /> : null}
            {documentMode ? <input type="hidden" name="documentType" value={documentType} /> : null}
            {documentMode ? <input type="hidden" name="trainMode" value={trainMode} /> : null}
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
              Apply
            </Button>
          </form>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 rounded-xl px-3 text-sm lg:hidden">
                <CalendarDays className="size-4" />
                Range
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-xl p-2">
              <form action={basePath} method="get" className="grid gap-2">
                {slug ? <input type="hidden" name="type" value={slug} /> : null}
                {companyId ? <input type="hidden" name="companyId" value={companyId} /> : null}
                {terminalId ? <input type="hidden" name="terminalId" value={terminalId} /> : null}
                <input type="hidden" name="preset" value="custom" />
                <input type="hidden" name="period" value={period} />
                {canSort ? <input type="hidden" name="sortOrder" value={sortOrder} /> : null}
                {keyword ? <input type="hidden" name="keyword" value={keyword} /> : null}
                {documentMode ? <input type="hidden" name="documentType" value={documentType} /> : null}
                {documentMode ? <input type="hidden" name="trainMode" value={trainMode} /> : null}
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
            </DropdownMenuContent>
          </DropdownMenu>

            {terminalOptions.length > 0 && !documentMode ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-xl px-3 text-sm">
                    <MonitorSmartphone className="size-4" />
                    <span className="max-w-[10rem] truncate">{activeTerminalLabel}</span>
                    <ArrowRightLeft className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 rounded-xl">
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link
                      href={buildFilterHref({
                        basePath,
                        preset,
                        period,
                        companyId,
                        terminalId: null,
                        sortOrder,
                        documentType,
                        trainMode,
                      })}
                    >
                      <MonitorSmartphone className="size-4" />
                      <span className="flex-1">All terminals</span>
                    </Link>
                  </DropdownMenuItem>
                  {terminalOptions.map((item) => (
                    <DropdownMenuItem key={item.id} asChild className="rounded-xl">
                      <Link
                        href={buildFilterHref({
                          basePath,
                          preset,
                          period,
                          companyId,
                          terminalId: item.id,
                          sortOrder,
                          documentType,
                          trainMode,
                        })}
                      >
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
                    <span>{sortOrder === "oldest" ? "Oldest" : "Newest"}</span>
                    <ArrowRightLeft className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 rounded-xl">
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link
                      href={buildFilterHref({
                        basePath,
                        preset,
                        period,
                        companyId,
                        terminalId,
                        sortOrder: "newest",
                        documentType,
                        trainMode,
                      })}
                    >
                      <Clock3 className="size-4" />
                      <span className="flex-1">Newest first</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link
                      href={buildFilterHref({
                        basePath,
                        preset,
                        period,
                        companyId,
                        terminalId,
                        sortOrder: "oldest",
                        documentType,
                        trainMode,
                      })}
                    >
                      <Clock3 className="size-4" />
                      <span className="flex-1">Oldest first</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

          {canSearchInvoiceTrace ? (
            <form
              action={basePath}
              method="get"
              className="flex min-w-[14rem] items-center gap-1.5"
            >
              {slug ? <input type="hidden" name="type" value={slug} /> : null}
              {companyId ? <input type="hidden" name="companyId" value={companyId} /> : null}
              {terminalId ? <input type="hidden" name="terminalId" value={terminalId} /> : null}
              <input type="hidden" name="preset" value={preset} />
              <input type="hidden" name="period" value={period} />
              <input type="hidden" name="from" value={fromInput} />
              <input type="hidden" name="to" value={toInput} />
              {canSort ? <input type="hidden" name="sortOrder" value={sortOrder} /> : null}
              {documentMode ? <input type="hidden" name="documentType" value={documentType} /> : null}
              {documentMode ? <input type="hidden" name="trainMode" value={trainMode} /> : null}
              <Input
                name="keyword"
                defaultValue={keyword}
                placeholder="Search invoice or SI ref"
                className="h-9 w-48 rounded-xl text-sm"
              />
              <Button type="submit" variant="outline" className="h-9 rounded-xl px-3 text-sm">
                <Search className="size-4" />
              </Button>
            </form>
          ) : null}

          {exportBaseUrl && !documentMode ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 rounded-xl px-3 text-sm">
                  <Download className="size-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link href={`${exportBaseUrl}&format=csv`}>
                    <Download className="size-4" />
                    CSV
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link href={`${exportBaseUrl}&format=xls`}>
                    <FileSpreadsheet className="size-4" />
                    Excel
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </HeaderActions>

      {showPeriodTabs && !documentMode ? (
      <div className="rounded-2xl border border-border/70 bg-card/95 p-2 shadow-sm">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1">
          {periods.map((item) => (
            <Button
              key={item.id}
              asChild
              variant={period === item.id ? "default" : "ghost"}
              className={cn(
                "h-10 min-w-0 rounded-lg px-2 text-xs font-bold sm:text-sm",
                period === item.id && "shadow-sm",
                dateControlsDisabled && item.id !== "annual" && "pointer-events-none opacity-50",
              )}
            >
              <Link
                href={buildFilterHref({
                  basePath,
                  preset: item.preset,
                  period: item.id,
                  companyId,
                  terminalId,
                  sortOrder,
                })}
              >
                <span className="truncate">{item.label}</span>
              </Link>
            </Button>
          ))}
        </div>

        {dateHint ? (
          <div className="mt-2 rounded-xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {dateHint}
          </div>
        ) : null}
      </div>
      ) : dateHint ? (
        <div className="rounded-xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {dateHint}
        </div>
      ) : null}
    </>
  );
}

function getPeriodForPreset(preset: ReportPreset, fallback: ReportPeriod): ReportPeriod {
  if (preset === "7d") return "weekly";
  if (preset === "30d" || preset === "thisMonth" || preset === "lastMonth") return "monthly";
  if (preset === "thisYear" || preset === "lastYear" || preset === "all") return "annual";
  if (preset === "custom") return fallback;

  return "daily";
}

function buildFilterHref(input: {
  basePath: string;
  preset: ReportPreset;
  period: ReportPeriod;
  companyId?: string | null;
  terminalId?: string | null;
  sortOrder?: ReportSortOrder;
  documentType?: InvoiceDocumentItemDto["type"] | "all";
  trainMode?: "all" | "training" | "live";
  keyword?: string;
}) {
  const params = new URLSearchParams({
    preset: input.preset,
    period: input.period,
  });

  if (input.companyId) params.set("companyId", input.companyId);
  if (input.terminalId) params.set("terminalId", input.terminalId);
  if (input.sortOrder) params.set("sortOrder", input.sortOrder);
  if (input.keyword) params.set("keyword", input.keyword);
  if (input.documentType && input.documentType !== "all") {
    params.set("documentType", input.documentType);
  }
  if (input.trainMode && input.trainMode !== "all") {
    params.set("trainMode", input.trainMode);
  }

  return `${input.basePath}?${params.toString()}`;
}
