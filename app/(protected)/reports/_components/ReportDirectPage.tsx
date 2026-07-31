import { notFound } from "next/navigation";
import { ReportErrorState } from "@/app/(protected)/report/_components/ReportListPrimitives";
import { ReportPaginationBar } from "@/app/(protected)/report/_components/ReportPaginationBar";
import { ReportPrintControls } from "@/app/(protected)/report/_components/ReportPrintControls";
import {
  AuditPanel,
  DebtCollectionsPanel,
  DebtOutstandingPanel,
  DailyTransactionsPanel,
  DiscountReportPanel,
  InvoiceDocumentsPanel,
  InventoryValuePanel,
  NonSalesIncomePanel,
  RefundInvoicesPanel,
  ProductProfitPanel,
  ProductVelocityPanel,
  ReturnedInvoiceRecordsPanel,
  ReturnedItemsPanel,
  RevenueGoalPanel,
  SalesBookPanel,
  TransactionListPanel,
  TransactionsPanel,
  VoidedListPanel,
  XReadingPanel,
  ZReadingPanel,
} from "@/app/(protected)/report/_components/ReportPanels";
import type { reportPageService } from "../_services/report-page.service";
import { ReportFilterToolbar } from "./ReportFilterToolbar";
import { ReportPageSummaryCards } from "./ReportSummaryCards";

type DirectPageData = Awaited<ReturnType<typeof reportPageService.loadReportPage>>;

export function ReportDirectPage({ data }: { data: DirectPageData }) {
  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  {data.definition.category}
                </span>
                {data.scope.companyName ? (
                  <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                    {data.scope.companyName}
                  </span>
                ) : null}
                {data.scope.terminalName ? (
                  <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                    {data.scope.terminalName}
                  </span>
                ) : null}
              </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  {data.definition.label}
                </h1>
              <p className="max-w-3xl text-sm leading-5 text-muted-foreground">
                  {data.definition.description}
                </p>
              </div>
            </div>

          <div className="flex flex-wrap xl:justify-end">
              <ReportPrintControls
                payload={data.printPayload}
                companyId={data.scope.companyId}
                terminalId={data.scope.terminalId ?? null}
              />
            </div>
          </div>
      </div>

      <ReportFilterToolbar
        basePath={`/reports/${data.definition.slug}`}
        slug={data.definition.slug}
        preset={data.range.preset}
        fromInput={data.range.fromInput}
        toInput={data.range.toInput}
        period={data.range.period}
        companyId={data.scope.companyId}
        terminalId={data.scope.terminalId}
        exportBaseUrl={data.exportBaseUrl}
        terminalOptions={data.workspace.terminals}
        dateControlsDisabled={data.isDateLockedToAllHistory}
        view={data.definition.view}
        sortOrder={data.range.sortOrder}
        keyword={data.range.keyword}
        status={data.range.status}
        branchId={data.range.branchId}
        cashierId={data.range.cashierId}
        branchOptions={data.workspace.branches}
        cashierOptions={data.workspace.cashiers}
        dateHint={
          data.definition.slug === "documents"
            ? "Document reports use only document type, date range, and train-mode filters."
            : data.definition.slug === "z-reading"
            ? "Z-Reading always covers the full sales history of the selected terminal or current scope."
            : data.definition.slug === "x-reading"
              ? "X-Reading is based on the active or latest session for the selected terminal."
              : undefined
        }
        documentMode={data.definition.slug === "documents"}
        showPeriodTabs={data.definition.slug !== "documents"}
        documentType={data.range.documentType}
        trainMode={data.range.trainMode}
      />

      <ReportPageSummaryCards
        slug={data.definition.slug}
        overview={data.overview}
        data={data.data}
      />

      {renderReportPanel(data)}

      {data.pagination ? (
        <ReportPaginationBar
          pagination={data.pagination}
          basePath={`/reports/${data.definition.slug}`}
          view={data.definition.view}
          from={data.range.fromInput}
          to={data.range.toInput}
          activeTerminalId={data.scope.terminalId ?? undefined}
          sortOrder={data.range.sortOrder}
          status={data.range.status}
          branchId={data.range.branchId}
          cashierId={data.range.cashierId}
          period={data.range.period}
          documentType={data.range.documentType}
          trainMode={data.range.trainMode}
          keyword={data.range.keyword}
        />
      ) : null}
    </div>
  );
}

function renderReportPanel(data: NonNullable<DirectPageData>) {
  switch (data.definition.slug) {
    case "sales":
      return <TransactionsPanel history={data.data as Parameters<typeof TransactionsPanel>[0]["history"]} />;
    case "daily-transactions":
      return <DailyTransactionsPanel report={data.data as Parameters<typeof DailyTransactionsPanel>[0]["report"]} />;
    case "debt-outstanding":
      return <DebtOutstandingPanel report={data.data as Parameters<typeof DebtOutstandingPanel>[0]["report"]} />;
    case "debt-collections":
      return <DebtCollectionsPanel report={data.data as Parameters<typeof DebtCollectionsPanel>[0]["report"]} />;
    case "documents":
      return <InvoiceDocumentsPanel report={data.data as Parameters<typeof InvoiceDocumentsPanel>[0]["report"]} />;
    case "transaction-list":
      return <TransactionListPanel report={data.data as Parameters<typeof TransactionListPanel>[0]["report"]} />;
    case "sales-book":
      return <SalesBookPanel report={data.data as Parameters<typeof SalesBookPanel>[0]["report"]} />;
    case "product-profit":
      return <ProductProfitPanel report={data.data as Parameters<typeof ProductProfitPanel>[0]["report"]} />;
    case "movement-velocity":
      return <ProductVelocityPanel report={data.data as Parameters<typeof ProductVelocityPanel>[0]["report"]} />;
    case "inventory-value":
      return <InventoryValuePanel report={data.data as Parameters<typeof InventoryValuePanel>[0]["report"]} />;
    case "revenue-goal":
      return <RevenueGoalPanel report={data.data as Parameters<typeof RevenueGoalPanel>[0]["report"]} />;
    case "non-sales-income":
      return <NonSalesIncomePanel report={data.data as Parameters<typeof NonSalesIncomePanel>[0]["report"]} />;
    case "x-reading":
      return <XReadingPanel reading={data.data as Parameters<typeof XReadingPanel>[0]["reading"]} />;
    case "z-reading":
      return <ZReadingPanel reading={data.data as Parameters<typeof ZReadingPanel>[0]["reading"]} />;
    case "audit-trail":
      return <AuditPanel audit={data.data as Parameters<typeof AuditPanel>[0]["audit"]} />;
    case "voided":
      return <VoidedListPanel report={data.data as Parameters<typeof VoidedListPanel>[0]["report"]} />;
    case "discounts":
    case "senior-discounts":
    case "dswd-discounts":
      return <DiscountReportPanel report={data.data as Parameters<typeof DiscountReportPanel>[0]["report"]} />;
    case "refunds":
      return <RefundInvoicesPanel report={data.data as Parameters<typeof RefundInvoicesPanel>[0]["report"]} />;
    case "returned-items":
      return <ReturnedItemsPanel report={data.data as Parameters<typeof ReturnedItemsPanel>[0]["report"]} />;
    case "returned-records":
      return (
        <ReturnedInvoiceRecordsPanel
          report={data.data as Parameters<typeof ReturnedInvoiceRecordsPanel>[0]["report"]}
        />
      );
    default:
      return (
        <ReportErrorState message="This report page could not be displayed." />
      );
  }
}
