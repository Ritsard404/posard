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

const REPORT_VIEWS: Array<{
  id: ReportPrintableView;
  label: string;
  description: string;
  icon: typeof BarChart3;
}> = [
  { id: "overview", label: "Overview", description: "Snapshot of sales and operations.", icon: BarChart3 },
  { id: "daily-transactions", label: "Daily Transactions", description: "Daily rollups by date and terminal.", icon: CalendarDays },
  { id: "transaction-list", label: "Transaction List", description: "Ledger view with base, void, and refund entries.", icon: ClipboardList },
  { id: "transactions", label: "Sales History", description: "Invoice-level sales and payment history.", icon: ShoppingBag },
  { id: "voided-list", label: "Voided List", description: "Cancelled and voided invoice records.", icon: ListX },
  { id: "pwd-list", label: "PWD List", description: "Transactions with PWD discount application.", icon: ShieldAlert },
  { id: "senior-list", label: "Senior List", description: "Transactions with senior discount application.", icon: ShieldAlert },
  { id: "sales", label: "Sales Report", description: "Item-level sales and profitability.", icon: CreditCard },
  { id: "sales-book", label: "Sales Book", description: "Daily summarized sales book.", icon: Receipt },
  { id: "refund-invoices", label: "Refund Invoices", description: "Fully and partially refunded invoices.", icon: RotateCcw },
  { id: "returned-items", label: "Returned Items", description: "Returned line items across invoices.", icon: RotateCcw },
  { id: "returned-records", label: "Returned Records", description: "Returned invoice records with transaction context.", icon: FileClock },
  { id: "audit", label: "Audit Trail", description: "Manager approvals and session events.", icon: FileClock },
  { id: "x-reading", label: "X-Reading", description: "Latest session summary.", icon: ScanSearch },
  { id: "z-reading", label: "Z-Reading", description: "End-of-day totals and taxes.", icon: Receipt },
];

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

  return `/report?${params.toString()}`;
}

async function getDetailData(
  view: ReportPrintableView,
  filters: { from: Date; to: Date; terminalId?: string; page: number },
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

export async function ReportsWorkspace({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
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

  const terminalId = getParam(resolvedSearchParams, "terminalId") || undefined;
  const requestedPage = Number(getParam(resolvedSearchParams, "page") ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const workspaceResult = await getReportWorkspaceAction();

  if (!workspaceResult.success) {
    return <EmptyState message={workspaceResult.error} />;
  }

  if (!workspaceResult.data.companyId) {
    return <EmptyState message="Reports are not available until your account is assigned to a company." />;
  }

  const selectedTerminal =
    workspaceResult.data.terminals.find((terminal) => terminal.id === terminalId) ?? null;
  const filterPayload = {
    from: fromDate,
    to: toDate,
    page,
    ...(selectedTerminal ? { terminalId: selectedTerminal.id } : {}),
  };

  const [overviewResult, detailResult] = await Promise.all([
    getReportOverviewAction(filterPayload),
    getDetailData(selectedView, filterPayload),
  ]);

  const selectedViewMeta =
    REPORT_VIEWS.find((view) => view.id === selectedView) ?? REPORT_VIEWS[0];
  const printPayload = reportPrintService.buildPayload({
    view: selectedView,
    overview: overviewResult.success ? overviewResult.data : null,
    detail:
      detailResult && detailResult.success && selectedView !== "overview"
        ? detailResult.data
        : null,
    selectedTerminal,
  });

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/60 bg-gradient-to-br from-background via-background to-muted/40 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 uppercase tracking-[0.16em]">
                  Reports Workspace
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {selectedTerminal ? selectedTerminal.name : "All terminals"}
                </Badge>
              </div>
              <div>
                <CardTitle className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {selectedViewMeta.label}
                </CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-sm">
                  {selectedViewMeta.description}
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 rounded-2xl border bg-background px-4 py-3 text-sm">
                <CalendarDays className="size-4 text-muted-foreground" />
                <span>{formatDate(fromDate)} to {formatDate(toDate)}</span>
              </div>
              <ReportPrintControls payload={printPayload} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {REPORT_VIEWS.map((view) => (
              <Button key={view.id} asChild variant={view.id === selectedView ? "default" : "outline"} className="h-10 rounded-xl">
                <Link
                  href={buildReportHref({
                    view: view.id,
                    from: formatDateInput(fromDate),
                    to: formatDateInput(toDate),
                    terminalId: selectedTerminal?.id,
                    page: view.id === selectedView ? page : 1,
                  })}
                >
                  <view.icon className="size-4" />
                  {view.label}
                </Link>
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Switch between all terminals and a single terminal without resetting the report view.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <form action="/report" method="get" className="grid gap-4 sm:grid-cols-2 lg:flex lg:items-end">
            <input type="hidden" name="view" value={selectedView} />
            {selectedTerminal ? <input type="hidden" name="terminalId" value={selectedTerminal.id} /> : null}
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
                  <Link href={buildReportHref({ view: selectedView, from: formatDateInput(fromDate), to: formatDateInput(toDate) })}>
                    <MonitorSmartphone className="size-4" />
                    <span className="flex-1">All terminals</span>
                    {!selectedTerminal ? <Badge variant="secondary">Active</Badge> : null}
                  </Link>
                </DropdownMenuItem>
                {workspaceResult.data.terminals.map((terminal) => (
                  <DropdownMenuItem key={terminal.id} asChild className="rounded-lg">
                    <Link
                      href={buildReportHref({
                        view: selectedView,
                        from: formatDateInput(fromDate),
                        to: formatDateInput(toDate),
                        terminalId: terminal.id,
                        page: 1,
                      })}
                    >
                      <MonitorSmartphone className="size-4" />
                      <span className="flex-1">{terminal.name}</span>
                      {selectedTerminal?.id === terminal.id ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : terminal.isActive ? (
                        <Badge variant="outline">Live</Badge>
                      ) : null}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

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
                              view: selectedView,
                              from: formatDateInput(fromDate),
                              to: formatDateInput(toDate),
                              terminalId: selectedTerminal?.id,
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
                              view: selectedView,
                              from: formatDateInput(fromDate),
                              to: formatDateInput(toDate),
                              terminalId: selectedTerminal?.id,
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
