import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/app/(protected)/report/_components/ReportListPrimitives";
import { AdminReportsIndexClient } from "@/app/(protected)/report/_components/AdminReportsIndexClient";
import { ReportFilterToolbar } from "./ReportFilterToolbar";
import { ReportsOverviewChart } from "./ReportsOverviewChart";
import { OverviewSummaryCards } from "./ReportSummaryCards";
import type { reportPageService } from "../_services/report-page.service";

type OverviewData = Awaited<ReturnType<typeof reportPageService.loadOverview>>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function ReportsOverviewPage({ data }: { data: OverviewData }) {
  if (data.mode === "empty") {
    return (
      <EmptyState
        title="Reports unavailable"
        message="Reports are not available until your account is assigned to a company."
      />
    );
  }

  if (data.mode === "admin") {
    return <AdminReportsIndexClient pageData={data.companies} />;
  }

  const overviewHrefSuffix = `?preset=${data.range.preset}&period=${data.range.period}&from=${data.range.fromInput}&to=${data.range.toInput}`;
  const paymentTotal = data.overview.paymentMethodBreakdown.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  return (
    <div className="space-y-3 lg:space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">
              Reports
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">
              {data.range.label}
            </span>
          </div>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">
            Business Report Overview
          </h1>
        </div>
      </div>

      <ReportFilterToolbar
        basePath="/reports"
        preset={data.range.preset}
        fromInput={data.range.fromInput}
        toInput={data.range.toInput}
        period={data.range.period}
        showPeriodTabs={false}
      />

      <OverviewSummaryCards overview={data.overview} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)]">
        <Card className="rounded-xl border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold tracking-tight">
                7-Day Sales Trend
              </CardTitle>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-black tracking-tight">
                  {formatCurrency(
                    data.overview.salesTrend.reduce((sum, item) => sum + item.sales, 0),
                  )}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {formatCount(
                    data.overview.salesTrend.reduce(
                      (sum, item) => sum + item.transactions,
                      0,
                    ),
                  )}{" "}
                  transactions
                </span>
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 rounded-full text-[11px]">
              {formatPercent(data.overview.trendChangePercent)} vs last week
            </Badge>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <ReportsOverviewChart data={data.overview.salesTrend} />
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-sm">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-bold tracking-tight">
              Wallet / Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4 pt-0">
            {[
              ["Total", formatCurrency(data.overview.wallet.total)],
              ["Cash", formatCurrency(data.overview.wallet.cash)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-muted/35 px-3 py-2">
                <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                <span className="text-sm font-black">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="rounded-xl border-border/70 shadow-sm">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-bold tracking-tight">
              Payment Methods
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {formatCount(data.overview.totalTransactions)} transactions ·{" "}
              {formatCurrency(paymentTotal)}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4 pt-0">
            {data.overview.paymentMethodBreakdown.length > 0 ? (
              data.overview.paymentMethodBreakdown.map((item) => {
                const percent = paymentTotal > 0 ? (item.amount / paymentTotal) * 100 : 0;

                return (
                  <div key={item.name} className="space-y-1.5 rounded-lg border border-border/60 p-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCount(item.count)} transactions
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black">{formatCurrency(item.amount)}</div>
                        <div className="text-xs text-muted-foreground">{percent.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No payments recorded in this range.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-sm">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-bold tracking-tight">
              Inventory Health
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 pb-4 pt-0 sm:grid-cols-2">
            {[
              ["Total Stock Value", formatCurrency(data.overview.inventoryHealth.totalStockValue), `${formatCount(data.overview.inventoryHealth.trackedItemCount)} items across ${formatCount(data.overview.inventoryHealth.trackedProductCount)} products`],
              ["Potential Retail Value", formatCurrency(data.overview.inventoryHealth.potentialRetailValue), `${formatCurrency(data.overview.inventoryHealth.potentialProfit)} potential profit`],
              ["Low Stock", formatCount(data.overview.inventoryHealth.lowStockCount), "At or below 10 units"],
              ["Out of Stock", formatCount(data.overview.inventoryHealth.outOfStockCount), "Needs replenishment"],
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-lg bg-muted/35 px-3 py-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </div>
                <div className="mt-1 text-lg font-black tracking-tight">{value}</div>
                <div className="text-xs text-muted-foreground">{hint}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 py-3">
          <CardTitle className="text-sm font-bold tracking-tight">
            Top Products by Revenue
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-8 px-2">
            <Link href={`/reports/sales${overviewHrefSuffix}`}>
              Open sales <ArrowUpRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {data.overview.topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="w-12 py-2 text-left font-semibold">Rank</th>
                    <th className="py-2 text-left font-semibold">Product</th>
                    <th className="py-2 text-right font-semibold">Qty Sold</th>
                    <th className="py-2 text-right font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.overview.topProducts.map((product, index) => (
                    <tr key={product.id}>
                      <td className="py-2">
                        <Badge variant="secondary" className="rounded-full px-2">
                          #{index + 1}
                        </Badge>
                      </td>
                      <td className="py-2 font-semibold">{product.name}</td>
                      <td className="py-2 text-right">{formatCount(product.quantitySold)}</td>
                      <td className="py-2 text-right font-black">
                        {formatCurrency(product.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No product sales recorded in this range.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {data.quickLinks.map((item) => (
          <Link
            key={item.slug}
            href={`/reports/${item.slug}${overviewHrefSuffix}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2 text-sm font-semibold shadow-sm transition-colors hover:bg-muted/40"
          >
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{item.category}</span>
          </Link>
        ))}
      </div>

      {data.workspace.terminals.length === 0 ? (
        <EmptyState
          title="No terminals available"
          message="This company does not have active terminals configured yet."
          icon={Building2}
        />
      ) : null}
    </div>
  );
}
