 "use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Receipt, ShieldAlert, ShoppingCart, Wallet } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardDataDto } from "../_services/_dto/dashboard.dto";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-rose-600"
          : "text-foreground";

  return (
    <Card className="rounded-3xl border-border/60 bg-white/90 shadow-sm">
      <CardContent className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className={`mt-3 text-3xl font-black tracking-tight ${toneClass}`}>
          {label.toLowerCase().includes("sales") ||
          label.toLowerCase().includes("basket") ||
          label.toLowerCase().includes("returns") ||
          label.toLowerCase().includes("voids")
            ? formatCurrency(value)
            : formatCompact(value)}
        </p>
        {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-3xl border-border/60 bg-white/90 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TrendChart({ data }: { data: DashboardDataDto["trend"] }) {
  const chartConfig = {
    sales: { label: "Sales", color: "#0f766e" },
    transactions: { label: "Transactions", color: "#06b6d4" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="h-[320px]">
      <AreaChart accessibilityLayer data={data} margin={{ left: 8, right: 8, top: 12 }}>
        <defs>
          <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="fillTransactions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-transactions)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-transactions)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <YAxis hide />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) =>
                name === "sales" ? formatCurrency(value) : `${value} txns`
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="sales"
          stroke="var(--color-sales)"
          strokeWidth={2.5}
          fill="url(#fillSales)"
        />
        <Area
          type="monotone"
          dataKey="transactions"
          stroke="var(--color-transactions)"
          strokeWidth={2}
          fill="url(#fillTransactions)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

function RankedBars({
  items,
  metricLabel,
}: {
  items: Array<{ id: string; name: string; secondaryLabel: string; sales: number; transactions: number; statusLabel: string }>;
  metricLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No data for this section yet.</p>;
  }

  const chartConfig = {
    sales: { label: metricLabel, color: "#0ea5e9" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-4">
      <ChartContainer config={chartConfig} className="h-[300px]">
        <BarChart accessibilityLayer data={items} layout="vertical" margin={{ left: 8, right: 12 }}>
          <CartesianGrid horizontal={false} strokeDasharray="4 4" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(value)}
              />
            }
          />
          <Bar dataKey="sales" fill="var(--color-sales)" radius={10} />
        </BarChart>
      </ChartContainer>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
            <div>
              <div className="font-semibold text-foreground">{item.name}</div>
              <div className="text-sm text-muted-foreground">{item.secondaryLabel}</div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="rounded-full">
                {item.statusLabel}
              </Badge>
              <div className="mt-2 font-semibold">{formatCurrency(item.sales)}</div>
              <div className="text-xs text-muted-foreground">{item.transactions} transactions</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentMixChart({ items }: { items: DashboardDataDto["paymentMix"] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        No electronic payment activity recorded for this view today.
      </div>
    );
  }

  const palette = ["#0f766e", "#0891b2", "#2563eb", "#7c3aed", "#ea580c", "#dc2626"];
  const chartConfig = Object.fromEntries(
    items.map((item, index) => [
      item.label,
      { label: item.label, color: palette[index % palette.length] },
    ]),
  ) satisfies ChartConfig;

  const data = items.map((item) => ({
    ...item,
    fill: chartConfig[item.label].color,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => formatCurrency(value)}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Pie
          data={data}
          dataKey="amount"
          nameKey="label"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={3}
          strokeWidth={2}
        >
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

function ProductList({
  items,
  quantityLabel,
}: {
  items: Array<{ id: string; name: string; category: string | null; quantity: number; sales: number }>;
  quantityLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing to show yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
          <div>
            <div className="font-semibold text-foreground">{item.name}</div>
            <div className="text-sm text-muted-foreground">
              {item.category ?? "Uncategorized"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold">{quantityLabel} {formatCompact(item.quantity)}</div>
            <div className="text-sm text-muted-foreground">{formatCurrency(item.sales)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardScreen({ dashboard }: { dashboard: DashboardDataDto }) {
  const primaryAction =
    dashboard.role === "admin"
      ? { href: "/companies", label: "Manage Companies", icon: ArrowRight }
      : { href: "/pos", label: "Open POS", icon: ShoppingCart };
  const secondaryAction =
    dashboard.role === "cashier"
      ? null
      : dashboard.role === "admin"
        ? { href: "/accounts", label: "Manage Accounts", icon: ShieldAlert }
        : { href: "/report", label: "Open Reports", icon: Receipt };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2rem] border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.2),_transparent_32%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.92))] shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-foreground px-3 py-1 text-primary-foreground">
                  Dashboard
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {dashboard.scopeLabel}
                </Badge>
                <Badge variant="secondary" className="rounded-full capitalize">
                  {dashboard.role}
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                  {dashboard.heroTitle}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  {dashboard.heroDescription}
                </p>
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Signed in as {dashboard.viewerName}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild className="rounded-xl">
                <Link href={primaryAction.href}>
                  <primaryAction.icon className="size-4" />
                  {primaryAction.label}
                </Link>
              </Button>
              {secondaryAction ? (
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href={secondaryAction.href}>
                    <secondaryAction.icon className="size-4" />
                    {secondaryAction.label}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.summary.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            tone={metric.tone}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <Section title="7-Day Sales Trend" description="A quick read on daily sales and transaction pace.">
          <TrendChart data={dashboard.trend} />
        </Section>

        <Section title="Alerts" description="Items that need attention today.">
          <div className="space-y-3">
            {dashboard.alerts.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                No urgent alerts. Operations look stable.
              </div>
            ) : (
              dashboard.alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-border/60 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert
                      className={`mt-0.5 size-4 ${
                        alert.tone === "danger"
                          ? "text-rose-500"
                          : alert.tone === "warning"
                            ? "text-amber-500"
                            : "text-cyan-500"
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-foreground">{alert.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {alert.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {dashboard.companyLeaderboard ? (
          <Section title="Top Companies" description="Best performing branches in the last 30 days.">
            <RankedBars items={dashboard.companyLeaderboard} metricLabel="Net sales" />
          </Section>
        ) : null}

        {dashboard.terminals ? (
          <Section title="Terminal Performance" description="Live read on terminal activity and sales output.">
            <RankedBars items={dashboard.terminals} metricLabel="Sales today" />
          </Section>
        ) : null}

        {dashboard.topProducts ? (
          <Section title="Top Products" description="Fast movers based on the last 30 days of sold line items.">
            <ProductList items={dashboard.topProducts} quantityLabel="Sold" />
          </Section>
        ) : null}

        {dashboard.lowStockProducts ? (
          <Section title="Low Stock Watch" description="Tracked items that may need replenishment soon.">
            <ProductList items={dashboard.lowStockProducts} quantityLabel="On hand" />
          </Section>
        ) : null}

        {dashboard.shift ? (
          <Section title="Current Shift" description="Your latest drawer session and terminal state.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Terminal
                </div>
                <div className="mt-2 text-lg font-bold">
                  {dashboard.shift.terminalName ?? "No recent terminal"}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Shift status
                </div>
                <div className="mt-2 text-lg font-bold">
                  {dashboard.shift.isOpen ? "Open" : "Closed"}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Opening fund
                </div>
                <div className="mt-2 text-lg font-bold">
                  {formatCurrency(dashboard.shift.openingFund)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Withdrawals
                </div>
                <div className="mt-2 text-lg font-bold">
                  {formatCurrency(dashboard.shift.withdrawalAmount)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 p-4 sm:col-span-2">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Opened at
                </div>
                <div className="mt-2 text-lg font-bold">
                  {dashboard.shift.openedAt ? formatDateTime(dashboard.shift.openedAt) : "No recorded shift yet"}
                </div>
              </div>
            </div>
          </Section>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <Section title="Payment Mix" description="How sales were split across payment methods today.">
          <div className="space-y-4">
            <PaymentMixChart items={dashboard.paymentMix} />
            <div className="space-y-3">
              {dashboard.paymentMix.map((payment) => (
                <div key={payment.label} className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-cyan-500" />
                    <span className="font-medium text-foreground">{payment.label}</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Recent Activity" description="Latest operational events and receipt updates.">
          <div className="space-y-3">
            {dashboard.recentActivities.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                No recent activity available.
              </div>
            ) : (
              dashboard.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3">
                  <div>
                    <div className="font-semibold text-foreground">{activity.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{activity.description}</div>
                  </div>
                  <div className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(activity.occurredAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
      </div>

      {dashboard.recentInvoices ? (
        <Section title="Recent Receipts" description="Most recent invoices relevant to your role and scope.">
          <div className="space-y-3">
            {dashboard.recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex flex-col gap-3 rounded-2xl border border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-foreground">
                    Invoice #{invoice.invoiceNumber} • {invoice.customerName}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {invoice.terminalName} • {invoice.status}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(invoice.amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(invoice.createdAt)}
                    </div>
                  </div>
                  {dashboard.role !== "cashier" ? (
                    <Button asChild variant="ghost" size="sm" className="rounded-xl">
                      <Link href="/report?view=transactions">
                        Open
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
