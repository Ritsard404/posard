import { notFound } from "next/navigation";
import { ReportErrorState } from "@/app/(protected)/report/_components/ReportListPrimitives";
import { ReportPaginationBar } from "@/app/(protected)/report/_components/ReportPaginationBar";
import { ReportPrintControls } from "@/app/(protected)/report/_components/ReportPrintControls";
import {
  AuditPanel,
  DailyTransactionsPanel,
  DiscountReportPanel,
  RefundInvoicesPanel,
  ReturnedInvoiceRecordsPanel,
  ReturnedItemsPanel,
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
    <div className="space-y-6">
      <div className="rounded-[30px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {data.definition.category}
                </span>
                {data.scope.companyName ? (
                  <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    {data.scope.companyName}
                  </span>
                ) : null}
                {data.scope.terminalName ? (
                  <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    {data.scope.terminalName}
                  </span>
                ) : null}
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {data.definition.label}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {data.definition.description}
                </p>
              </div>
            </div>

            <div className="xl:pt-1">
              <ReportPrintControls
                payload={data.printPayload}
                companyId={data.scope.companyId}
                terminalId={data.scope.terminalId ?? null}
              />
            </div>
          </div>
        </div>
      </div>

      <ReportFilterToolbar
        basePath={`/reports/${data.definition.slug}`}
        slug={data.definition.slug}
        preset={data.range.preset}
        fromInput={data.range.fromInput}
        toInput={data.range.toInput}
        companyId={data.scope.companyId}
        terminalId={data.scope.terminalId}
        exportBaseUrl={data.exportBaseUrl}
        terminalOptions={data.workspace.terminals}
        dateControlsDisabled={data.isDateLockedToAllHistory}
        dateHint={
          data.definition.slug === "z-reading"
            ? "Z-Reading always covers the full sales history of the selected terminal or current scope."
            : data.definition.slug === "x-reading"
              ? "X-Reading is based on the active or latest session for the selected terminal."
              : undefined
        }
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
    case "transaction-list":
      return <TransactionListPanel report={data.data as Parameters<typeof TransactionListPanel>[0]["report"]} />;
    case "sales-book":
      return <SalesBookPanel report={data.data as Parameters<typeof SalesBookPanel>[0]["report"]} />;
    case "x-reading":
      return <XReadingPanel reading={data.data as Parameters<typeof XReadingPanel>[0]["reading"]} />;
    case "z-reading":
      return <ZReadingPanel reading={data.data as Parameters<typeof ZReadingPanel>[0]["reading"]} />;
    case "audit-trail":
      return <AuditPanel audit={data.data as Parameters<typeof AuditPanel>[0]["audit"]} />;
    case "voided":
      return <VoidedListPanel report={data.data as Parameters<typeof VoidedListPanel>[0]["report"]} />;
    case "discounts":
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
