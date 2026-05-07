import Link from "next/link";
import { MonitorSmartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmptyState, ReportErrorState } from "./ReportListPrimitives";
import { ReportFilterBar } from "./ReportFilterBar";
import { ReportNavigationGroups } from "./ReportNavigationGroups";
import { ReportPaginationBar } from "./ReportPaginationBar";
import { ReportPrintControls } from "./ReportPrintControls";
import { ReportWorkspaceHeader } from "./ReportWorkspaceHeader";
import {
  getReportViewGroups,
  REPORT_VIEWS,
  type ReportPrintableView,
  type ReportSortOrder,
} from "./report-workspace-config";
import {
  formatReportDate,
  formatReportDateInput,
} from "@/lib/report-date-format";

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

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function isValidDate(value?: string) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

function formatDateInput(value: Date) {
  return formatReportDateInput(value);
}

function formatDate(value: Date) {
  return formatReportDate(value);
}

function buildReportHref(input: {
  basePath: string;
  view: ReportPrintableView;
  from: string;
  to: string;
  terminalId?: string;
  page?: number;
  sortOrder?: ReportSortOrder;
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

  if (input.sortOrder) {
    params.set("sortOrder", input.sortOrder);
  }

  return `${input.basePath}?${params.toString()}`;
}

async function getDetailData(
  view: ReportPrintableView,
  filters: {
    companyId?: string;
    from: Date;
    to: Date;
    terminalId?: string;
    page: number;
    sortOrder?: ReportSortOrder;
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

function toUserFacingMessage(kind: "workspace" | "overview" | "detail", fallback: string) {
  if (kind === "workspace") {
    return "The report workspace is not available right now. Please try again in a moment.";
  }

  if (kind === "overview") {
    return "The report summary could not be loaded for the selected scope.";
  }

  if (kind === "detail") {
    return "This report could not be loaded for the selected filters.";
  }

  return fallback;
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
  const activeSortOrder: ReportSortOrder =
    getParam(resolvedSearchParams, "sortOrder") === "oldest" ? "oldest" : "newest";
  const workspaceResult = await getReportWorkspaceAction(companyId ? { companyId } : undefined);

  if (!workspaceResult.success) {
    return <ReportErrorState message={toUserFacingMessage("workspace", workspaceResult.error)} />;
  }

  if (!workspaceResult.data.companyId) {
    return <EmptyState title="Reports unavailable" message={emptyStateMessage} />;
  }

  const selectedTerminal =
    workspaceResult.data.terminals.find((terminalOption) => terminalOption.id === activeTerminalId) ??
    null;

  if (terminalId && !selectedTerminal) {
    return (
      <EmptyState
        title="Terminal not found"
        message="This report view is tied to a terminal that is no longer available."
      />
    );
  }

  const filterPayload = {
    ...(companyId ? { companyId } : {}),
    from: fromDate,
    to: toDate,
    page,
    sortOrder: activeSortOrder,
    ...(activeTerminalId ? { terminalId: activeTerminalId } : {}),
  };

  const [overviewResult, detailResult] = await Promise.all([
    getReportOverviewAction(filterPayload),
    getDetailData(selectedView, filterPayload),
  ]);

  const selectedViewMeta =
    REPORT_VIEWS.find((view) => view.id === selectedView) ?? REPORT_VIEWS[0];
  const fromInput = formatDateInput(fromDate);
  const toInput = formatDateInput(toDate);
  const reportViewGroups = getReportViewGroups().map((group) => ({
    ...group,
    views: group.views.map((view) => ({
      ...view,
      href: buildReportHref({
        basePath,
        view: view.id,
        from: fromInput,
        to: toInput,
        terminalId: terminalId ? undefined : activeTerminalId,
        page: view.id === selectedView ? page : 1,
        sortOrder: activeSortOrder,
      }),
      isActive: view.id === selectedView,
    })),
  }));
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
    <div className="space-y-5 lg:space-y-6">
      <ReportWorkspaceHeader
        workspaceLabel={workspaceLabel}
        workspaceDescription={
          workspaceDescription ??
          "Review the right report without wading through a crowded selector."
        }
        resolvedScopeBadge={resolvedScopeBadge}
        companyName={companyName}
        selectedViewMeta={selectedViewMeta}
        dateLabel={`${formatDate(fromDate)} to ${formatDate(toDate)}`}
        printControls={
          <ReportPrintControls
            payload={printPayload}
            companyId={workspaceResult.data.companyId}
            terminalId={activeTerminalId ?? null}
          />
        }
      />

      <ReportNavigationGroups groups={reportViewGroups} />

      <ReportFilterBar
        basePath={basePath}
        selectedView={selectedView}
        from={fromInput}
        to={toInput}
        activeTerminalId={terminalId ? undefined : activeTerminalId}
        selectedTerminal={selectedTerminal}
        showTerminalScopeSwitcher={showTerminalScopeSwitcher}
        terminalOptions={workspaceResult.data.terminals}
        terminalLocked={Boolean(terminalId)}
        sortOrder={activeSortOrder}
      />

      {showTerminalDrilldown && terminalReportBasePath ? (
        <Card className="rounded-[28px] border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg tracking-tight">Terminals</CardTitle>
            <CardDescription className="leading-6">
              Open a terminal report to inspect a single device without losing the selected date range.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workspaceResult.data.terminals.length === 0 ? (
              <EmptyState
                title="No terminals yet"
                message="No terminals are configured for this company yet."
              />
            ) : (
              workspaceResult.data.terminals.map((terminalOption) => (
                <Link
                  key={terminalOption.id}
                  href={buildReportHref({
                    basePath: `${terminalReportBasePath}/${terminalOption.id}/report`,
                    view: selectedView,
                    from: fromInput,
                    to: toInput,
                    sortOrder: activeSortOrder,
                  })}
                  className="flex min-h-32 cursor-pointer flex-col justify-between rounded-[24px] border border-border/70 bg-muted/10 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <MonitorSmartphone className="size-4" />
                      </div>
                      <Badge variant={terminalOption.isActive ? "secondary" : "outline"}>
                        {terminalOption.isActive ? "Live" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold tracking-tight">{terminalOption.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {terminalOption.printerName || "No printer configured"}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {overviewResult.success ? (
        <OverviewPanel overview={overviewResult.data} />
      ) : (
        <ReportErrorState message={toUserFacingMessage("overview", overviewResult.error)} />
      )}

      {selectedView !== "overview" ? (
        !detailResult ? null : !detailResult.success ? (
          <ReportErrorState message={toUserFacingMessage("detail", detailResult.error)} />
        ) : (
          <div className="space-y-4">
            {renderDetailPanel(selectedView, detailResult.data as DetailResult)}

            {(() => {
              const pagination = getPaginationData(selectedView, detailResult.data as DetailResult);

              if (!pagination) {
                return null;
              }

              return (
                <ReportPaginationBar
                  pagination={pagination}
                  basePath={basePath}
                  view={selectedView}
                  from={fromInput}
                  to={toInput}
                  activeTerminalId={terminalId ? undefined : activeTerminalId}
                  sortOrder={activeSortOrder}
                />
              );
            })()}
          </div>
        )
      ) : null}
    </div>
  );
}
