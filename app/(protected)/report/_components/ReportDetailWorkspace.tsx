import Link from "next/link";
import {
  ArrowRightLeft,
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileClock,
  ListX,
  MonitorSmartphone,
  Receipt,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getAuditTrailAction,
  getDailyTransactionsAction,
  getPwdDiscountReportAction,
  getRefundInvoicesAction,
  getReportOverviewAction,
  getReportWorkspaceAction,
  getReturnedInvoiceRecordsAction,
  getReturnedItemsAction,
  getSalesBookAction,
  getSalesReportAction,
  getSeniorDiscountReportAction,
  getTransactionHistoryAction,
  getTransactionListAction,
  getVoidedListAction,
  getXReadingAction,
  getZReadingAction,
} from "../_actions/report.action";
import type {
  AuditTrailDto,
  DailyTransactionsDto,
  DiscountReportDto,
  RefundInvoicesDto,
  ReportPaginationDto,
  ReportPrintableView,
  ReturnedInvoiceRecordsDto,
  ReturnedItemsDto,
  SalesBookDto,
  SalesReportDto,
  TransactionHistoryDto,
  TransactionListDto,
  VoidedListDto,
  XReadingDto,
  ZReadingDto,
} from "../_services/_dto/report.dto";
import { reportPrintService } from "../_services/report-print.service";
import {
  AuditPanel,
  DailyTransactionsPanel,
  DiscountReportPanel,
  EmptyState,
  OverviewPanel,
  RefundInvoicesPanel,
  ReturnedInvoiceRecordsPanel,
  ReturnedItemsPanel,
  SalesBookPanel,
  SalesPanel,
  TransactionListPanel,
  TransactionsPanel,
  VoidedListPanel,
  XReadingPanel,
  ZReadingPanel,
} from "./ReportPanels";
import { ReportPrintControls } from "./ReportPrintControls";

type SearchParams = Record<string, string | string[] | undefined>;
type DetailResult =
  | AuditTrailDto
  | DailyTransactionsDto
  | DiscountReportDto
  | RefundInvoicesDto
  | ReturnedInvoiceRecordsDto
  | ReturnedItemsDto
  | SalesBookDto
  | SalesReportDto
  | TransactionHistoryDto
  | TransactionListDto
  | VoidedListDto
  | XReadingDto
  | ZReadingDto;

type ReportCategory =
  | "Overview"
  | "Sales Activity"
  | "Discounts & Returns"
  | "Compliance & Audit"
  | "Readings";

type ReportViewMeta = {
  id: ReportPrintableView;
  category: ReportCategory;
  label: string;
  description: string;
  supportingCopy: string;
  icon: typeof BarChart3;
};

const REPORT_VIEWS: ReportViewMeta[] = [
  {
    id: "overview",
    category: "Overview",
    label: "Overview",
    description: "Snapshot of sales and operations.",
    supportingCopy: "Start here for a high-level picture before opening a detailed report.",
    icon: BarChart3,
  },
  {
    id: "daily-transactions",
    category: "Sales Activity",
    label: "Daily Transactions",
    description: "Daily rollups by date and terminal.",
    supportingCopy: "Scan daily totals and invoice counts without opening the full ledger.",
    icon: CalendarDays,
  },
  {
    id: "transaction-list",
    category: "Sales Activity",
    label: "Transaction List",
    description: "Ledger view with base, void, and refund entries.",
    supportingCopy: "Review mixed transaction activity in posting order.",
    icon: ClipboardList,
  },
  {
    id: "transactions",
    category: "Sales Activity",
    label: "Sales History",
    description: "Invoice-level sales and payment history.",
    supportingCopy: "Inspect invoice records with payment and cashier context.",
    icon: ShoppingBag,
  },
  {
    id: "voided-list",
    category: "Discounts & Returns",
    label: "Voided List",
    description: "Cancelled and voided invoice records.",
    supportingCopy: "Review sales that were cancelled before settlement.",
    icon: ListX,
  },
  {
    id: "pwd-list",
    category: "Discounts & Returns",
    label: "PWD List",
    description: "Transactions with PWD discount application.",
    supportingCopy: "Filter discount usage for PWD-qualified invoices.",
    icon: ShieldAlert,
  },
  {
    id: "senior-list",
    category: "Discounts & Returns",
    label: "Senior List",
    description: "Transactions with senior discount application.",
    supportingCopy: "Review senior discount transactions and amounts applied.",
    icon: ShieldAlert,
  },
  {
    id: "sales",
    category: "Sales Activity",
    label: "Sales Report",
    description: "Item-level sales and profitability.",
    supportingCopy: "Break down sold items by revenue and profit contribution.",
    icon: CreditCard,
  },
  {
    id: "sales-book",
    category: "Sales Activity",
    label: "Sales Book",
    description: "Daily summarized sales book.",
    supportingCopy: "Use the day-by-day book when you need summarized reporting.",
    icon: Receipt,
  },
  {
    id: "refund-invoices",
    category: "Discounts & Returns",
    label: "Refund Invoices",
    description: "Fully and partially refunded invoices.",
    supportingCopy: "Trace refunded invoices without mixing them into normal sales views.",
    icon: RotateCcw,
  },
  {
    id: "returned-items",
    category: "Discounts & Returns",
    label: "Returned Items",
    description: "Returned line items across invoices.",
    supportingCopy: "Inspect item-level returns across the selected report range.",
    icon: RotateCcw,
  },
  {
    id: "returned-records",
    category: "Discounts & Returns",
    label: "Returned Records",
    description: "Returned invoice records with transaction context.",
    supportingCopy: "Open return history with the original transaction details attached.",
    icon: FileClock,
  },
  {
    id: "audit",
    category: "Compliance & Audit",
    label: "Audit Trail",
    description: "Manager approvals and session events.",
    supportingCopy: "Track approvals, role actions, and other control-sensitive events.",
    icon: FileClock,
  },
  {
    id: "x-reading",
    category: "Readings",
    label: "X-Reading",
    description: "Latest session summary.",
    supportingCopy: "Check the current session totals before end-of-day close.",
    icon: ScanSearch,
  },
  {
    id: "z-reading",
    category: "Readings",
    label: "Z-Reading",
    description: "End-of-day totals and taxes.",
    supportingCopy: "Use the final day-close report for totals, taxes, and closures.",
    icon: Receipt,
  },
];

const REPORT_CATEGORY_ORDER: ReportCategory[] = [
  "Overview",
  "Sales Activity",
  "Discounts & Returns",
  "Compliance & Audit",
  "Readings",
];

const REPORT_CATEGORY_DESCRIPTIONS: Record<ReportCategory, string> = {
  Overview: "Quick summary before drilling into a detailed report.",
  "Sales Activity": "Sales movement, invoice history, and item-level performance.",
  "Discounts & Returns": "Exceptions, discounts, voids, and after-sale adjustments.",
  "Compliance & Audit": "Operational checks and approval-sensitive activity.",
  Readings: "Shift and day-close readings for terminal control.",
};

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function isValidDate(value?: string) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function buildReportHref(input: {
  basePath: string;
  view: ReportPrintableView;
  from: string;
  to: string;
  terminalId?: string;
  page?: number;
}) {
  const params = new URLSearchParams({
    view: input.view,
    from: input.from,
    to: input.to,
  });

  if (input.terminalId) {
    params.set("terminalId", input.terminalId);
  }

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  return `${input.basePath}?${params.toString()}`;
}

function getReportViewGroups() {
  return REPORT_CATEGORY_ORDER.map((category) => ({
    category,
    description: REPORT_CATEGORY_DESCRIPTIONS[category],
    views: REPORT_VIEWS.filter((view) => view.category === category),
  })).filter((group) => group.views.length > 0);
}

async function getDetailData(
  view: ReportPrintableView,
  filters: {
    companyId?: string;
    from: Date;
    to: Date;
    terminalId?: string;
    page: number;
  },
) {
  switch (view) {
    case "x-reading":
      return getXReadingAction(filters);
    case "z-reading":
      return getZReadingAction(filters);
    case "daily-transactions":
      return getDailyTransactionsAction(filters);
    case "transaction-list":
      return getTransactionListAction(filters);
    case "transactions":
      return getTransactionHistoryAction(filters);
    case "voided-list":
      return getVoidedListAction(filters);
    case "pwd-list":
      return getPwdDiscountReportAction(filters);
    case "senior-list":
      return getSeniorDiscountReportAction(filters);
    case "sales":
      return getSalesReportAction(filters);
    case "sales-book":
      return getSalesBookAction(filters);
    case "refund-invoices":
      return getRefundInvoicesAction(filters);
    case "returned-items":
      return getReturnedItemsAction(filters);
    case "returned-records":
      return getReturnedInvoiceRecordsAction(filters);
    case "audit":
      return getAuditTrailAction(filters);
    default:
      return null;
  }
}

function getPaginationData(view: ReportPrintableView, data: DetailResult): ReportPaginationDto | null {
  if ("pagination" in data) {
    return data.pagination;
  }

  if (view === "x-reading" || view === "z-reading") {
    return null;
  }

  return null;
}

function renderDetailPanel(view: ReportPrintableView, data: DetailResult) {
  switch (view) {
    case "x-reading":
      return <XReadingPanel reading={data as XReadingDto} />;
    case "z-reading":
      return <ZReadingPanel reading={data as ZReadingDto} />;
    case "daily-transactions":
      return <DailyTransactionsPanel report={data as DailyTransactionsDto} />;
    case "transaction-list":
      return <TransactionListPanel report={data as TransactionListDto} />;
    case "transactions":
      return <TransactionsPanel history={data as TransactionHistoryDto} />;
    case "voided-list":
      return <VoidedListPanel report={data as VoidedListDto} />;
    case "pwd-list":
    case "senior-list":
      return <DiscountReportPanel report={data as DiscountReportDto} />;
    case "sales":
      return <SalesPanel report={data as SalesReportDto} />;
    case "sales-book":
      return <SalesBookPanel report={data as SalesBookDto} />;
    case "refund-invoices":
      return <RefundInvoicesPanel report={data as RefundInvoicesDto} />;
    case "returned-items":
      return <ReturnedItemsPanel report={data as ReturnedItemsDto} />;
    case "returned-records":
      return <ReturnedInvoiceRecordsPanel report={data as ReturnedInvoiceRecordsDto} />;
    case "audit":
      return <AuditPanel audit={data as AuditTrailDto} />;
    default:
      return null;
  }
}

interface ReportDetailWorkspaceProps {
  searchParams?: Promise<SearchParams>;
  basePath?: string;
  companyId?: string;
  terminalId?: string;
  companyName?: string | null;
  terminalName?: string | null;
  workspaceLabel?: string;
  workspaceDescription?: string;
  scopeBadgeLabel?: string;
  showTerminalScopeSwitcher?: boolean;
  showTerminalDrilldown?: boolean;
  terminalReportBasePath?: string;
  emptyStateMessage?: string;
}

export async function ReportDetailWorkspace({
  searchParams,
  basePath = "/report",
  companyId,
  terminalId,
  companyName,
  terminalName,
  workspaceLabel = "Reports Workspace",
  workspaceDescription,
  scopeBadgeLabel,
  showTerminalScopeSwitcher = true,
  showTerminalDrilldown = false,
  terminalReportBasePath,
  emptyStateMessage = "Reports are not available until your account is assigned to a company.",
}: ReportDetailWorkspaceProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedView = getParam(resolvedSearchParams, "view");
  const selectedView: ReportPrintableView = REPORT_VIEWS.some((view) => view.id === requestedView)
    ? (requestedView as ReportPrintableView)
    : "overview";

  const today = new Date();
  const fromDate = isValidDate(getParam(resolvedSearchParams, "from"))
    ? new Date(getParam(resolvedSearchParams, "from")!)
    : today;
  fromDate.setHours(0, 0, 0, 0);

  const toDate = isValidDate(getParam(resolvedSearchParams, "to"))
    ? new Date(getParam(resolvedSearchParams, "to")!)
    : new Date(fromDate);
  toDate.setHours(23, 59, 59, 999);

  const queryTerminalId = getParam(resolvedSearchParams, "terminalId") || undefined;
  const activeTerminalId = terminalId ?? queryTerminalId;
  const requestedPage = Number(getParam(resolvedSearchParams, "page") ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const workspaceResult = await getReportWorkspaceAction(companyId ? { companyId } : undefined);

  if (!workspaceResult.success) {
    return <EmptyState message={workspaceResult.error} />;
  }

  if (!workspaceResult.data.companyId) {
    return <EmptyState message={emptyStateMessage} />;
  }

  const selectedTerminal =
    workspaceResult.data.terminals.find((terminalOption) => terminalOption.id === activeTerminalId) ??
    null;

  if (terminalId && !selectedTerminal) {
    return <EmptyState message="Terminal not found for this report view." />;
  }

  const filterPayload = {
    ...(companyId ? { companyId } : {}),
    from: fromDate,
    to: toDate,
    page,
    ...(activeTerminalId ? { terminalId: activeTerminalId } : {}),
  };

  const [overviewResult, detailResult] = await Promise.all([
    getReportOverviewAction(filterPayload),
    getDetailData(selectedView, filterPayload),
  ]);

  const selectedViewMeta =
    REPORT_VIEWS.find((view) => view.id === selectedView) ?? REPORT_VIEWS[0];
  const reportViewGroups = getReportViewGroups();
  const printPayload = reportPrintService.buildPayload({
    view: selectedView,
    overview: overviewResult.success ? overviewResult.data : null,
    detail:
      detailResult && detailResult.success && selectedView !== "overview"
        ? detailResult.data
        : null,
    selectedTerminal,
  });
  const resolvedScopeBadge =
    scopeBadgeLabel ??
    (terminalName
      ? terminalName
      : selectedTerminal
        ? selectedTerminal.name
        : companyName
          ? `${companyName} / All terminals`
          : "All terminals");

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/60 shadow-sm">
        <CardHeader className="space-y-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 uppercase tracking-[0.16em]">
                  {workspaceLabel}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {resolvedScopeBadge}
                </Badge>
                {companyName ? (
                  <Badge variant="outline" className="rounded-full">
                    {companyName}
                  </Badge>
                ) : null}
              </div>
              <div>
                <CardTitle className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {workspaceLabel}
                </CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-sm">
                  {workspaceDescription ?? "Review the right report without wading through a crowded selector."}
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:items-end">
              <div className="flex items-center gap-2 rounded-2xl border bg-background px-4 py-3 text-sm">
                <CalendarDays className="size-4 text-muted-foreground" />
                <span>{formatDate(fromDate)} to {formatDate(toDate)}</span>
              </div>
              <ReportPrintControls payload={printPayload} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="rounded-3xl border bg-muted/20 p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <selectedViewMeta.icon className="size-5" />
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      Active report
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {selectedViewMeta.category}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-semibold tracking-tight">{selectedViewMeta.label}</div>
                    <p className="text-sm text-muted-foreground">{selectedViewMeta.description}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedViewMeta.supportingCopy}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-background p-5">
              <div className="space-y-1">
                <div className="text-sm font-semibold tracking-tight">Choose another report</div>
                <p className="text-sm text-muted-foreground">
                  Reports are grouped by task so the list is easier to scan.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {reportViewGroups.map((group) => (
              <div key={group.category} className="space-y-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold tracking-tight">{group.category}</div>
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {group.views.map((view) => {
                    const isActive = view.id === selectedView;

                    return (
                      <Button
                        key={view.id}
                        asChild
                        variant="ghost"
                        className={cn(
                          "h-auto min-h-28 justify-start rounded-2xl border px-4 py-4 text-left transition-colors",
                          isActive
                            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/95 hover:text-primary-foreground"
                            : "border-border bg-background hover:bg-muted/40",
                        )}
                      >
                        <Link
                          href={buildReportHref({
                            basePath,
                            view: view.id,
                            from: formatDateInput(fromDate),
                            to: formatDateInput(toDate),
                            terminalId: terminalId ? undefined : activeTerminalId,
                            page: view.id === selectedView ? page : 1,
                          })}
                          className="flex h-full w-full items-start gap-3"
                        >
                          <div
                            className={cn(
                              "rounded-2xl p-2.5",
                              isActive
                                ? "bg-primary-foreground/15 text-primary-foreground"
                                : "bg-muted text-foreground",
                            )}
                          >
                            <view.icon className="size-4" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="font-semibold leading-none">{view.label}</div>
                            {/* <div
                              className={cn(
                                "text-xs leading-5",
                                isActive ? "text-primary-foreground/85" : "text-muted-foreground",
                              )}
                            >
                              {view.supportingCopy}
                            </div> */}
                          </div>
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-3xl border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>
            {showTerminalScopeSwitcher
              ? "Adjust dates or terminal scope without changing the selected report."
              : "Adjust the date range without changing the selected reporting scope."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <form action={basePath} method="get" className="grid gap-4 sm:grid-cols-2 lg:flex lg:items-end">
            <input type="hidden" name="view" value={selectedView} />
            {!terminalId && activeTerminalId ? (
              <input type="hidden" name="terminalId" value={activeTerminalId} />
            ) : null}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">From</div>
              <Input type="date" name="from" defaultValue={formatDateInput(fromDate)} className="h-11 min-w-[180px] rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">To</div>
              <Input type="date" name="to" defaultValue={formatDateInput(toDate)} className="h-11 min-w-[180px] rounded-xl" />
            </div>
            <Button type="submit" className="h-11 rounded-xl">Apply Filters</Button>
          </form>

          {showTerminalScopeSwitcher ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Terminal Scope</div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-11 min-w-[220px] justify-between rounded-xl",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <MonitorSmartphone className="size-4" />
                    {selectedTerminal ? selectedTerminal.name : "All terminals"}
                  </span>
                  <ArrowRightLeft className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 rounded-xl">
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href={buildReportHref({ basePath, view: selectedView, from: formatDateInput(fromDate), to: formatDateInput(toDate) })}>
                      <MonitorSmartphone className="size-4" />
                      <span className="flex-1">All terminals</span>
                      {!selectedTerminal ? <Badge variant="secondary">Active</Badge> : null}
                    </Link>
                  </DropdownMenuItem>
                  {workspaceResult.data.terminals.map((terminalOption) => (
                    <DropdownMenuItem key={terminalOption.id} asChild className="rounded-lg">
                      <Link
                        href={buildReportHref({
                          basePath,
                          view: selectedView,
                          from: formatDateInput(fromDate),
                          to: formatDateInput(toDate),
                          terminalId: terminalOption.id,
                          page: 1,
                        })}
                      >
                        <MonitorSmartphone className="size-4" />
                        <span className="flex-1">{terminalOption.name}</span>
                        {selectedTerminal?.id === terminalOption.id ? (
                          <Badge variant="secondary">Active</Badge>
                        ) : terminalOption.isActive ? (
                          <Badge variant="outline">Live</Badge>
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {showTerminalDrilldown && terminalReportBasePath ? (
        <Card className="rounded-3xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Terminals</CardTitle>
            <CardDescription>Open a terminal report to inspect a single device without losing the selected date range.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspaceResult.data.terminals.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                No terminals are configured for this company yet.
              </div>
            ) : (
              workspaceResult.data.terminals.map((terminalOption) => (
                <Link
                  key={terminalOption.id}
                  href={buildReportHref({
                    basePath: `${terminalReportBasePath}/${terminalOption.id}/report`,
                    view: selectedView,
                    from: formatDateInput(fromDate),
                    to: formatDateInput(toDate),
                  })}
                  className="rounded-2xl border p-4 transition hover:border-primary hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{terminalOption.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {terminalOption.printerName || "No printer configured"}
                      </div>
                    </div>
                    <Badge variant={terminalOption.isActive ? "secondary" : "outline"}>
                      {terminalOption.isActive ? "Live" : "Inactive"}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {overviewResult.success ? <OverviewPanel overview={overviewResult.data} /> : <EmptyState message={overviewResult.error} />}

      {selectedView !== "overview" ? (
        !detailResult ? null : !detailResult.success ? (
          <EmptyState message={detailResult.error} />
        ) : (
          <div className="space-y-4">
            {renderDetailPanel(selectedView, detailResult.data as DetailResult)}

            {(() => {
              const pagination = getPaginationData(selectedView, detailResult.data as DetailResult);

              if (!pagination || pagination.totalItems <= pagination.pageSize) {
                return null;
              }

              return (
                <Card className="rounded-2xl">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages} / {pagination.totalItems} records
                    </div>
                    <div className="flex items-center gap-2">
                      {pagination.hasPreviousPage ? (
                        <Button asChild variant="outline" className="rounded-xl">
                          <Link
                            href={buildReportHref({
                              basePath,
                              view: selectedView,
                              from: formatDateInput(fromDate),
                              to: formatDateInput(toDate),
                              terminalId: terminalId ? undefined : activeTerminalId,
                              page: Math.max(1, pagination.page - 1),
                            })}
                          >
                            Previous
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="outline" className="rounded-xl" disabled>
                          Previous
                        </Button>
                      )}
                      {pagination.hasNextPage ? (
                        <Button asChild variant="outline" className="rounded-xl">
                          <Link
                            href={buildReportHref({
                              basePath,
                              view: selectedView,
                              from: formatDateInput(fromDate),
                              to: formatDateInput(toDate),
                              terminalId: terminalId ? undefined : activeTerminalId,
                              page: pagination.page + 1,
                            })}
                          >
                            Next
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="outline" className="rounded-xl" disabled>
                          Next
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )
      ) : null}
    </div>
  );
}
