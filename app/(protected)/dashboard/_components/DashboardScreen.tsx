"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Activity,
  Building2,
  CheckCircle2,
  Clock3,
  PackagePlus,
  Receipt,
  Scale,
  ServerCog,
  ShieldAlert,
  ShoppingCart,
  Target,
  WifiOff,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardDataDto } from "../_services/_dto/dashboard.dto";
import { upsertRevenueGoalAction } from "../_actions/dashboard.actions";

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

function formatDateTime(value: Date | null) {
  if (!value) {
    return "No recent activity";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatShortDate(value: Date | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
    <Card className="rounded-lg border-border/60 bg-background shadow-sm sm:rounded-xl">
      <CardContent className="p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className={`mt-1.5 text-xl font-black tracking-tight sm:text-2xl ${toneClass}`}>
          {label.toLowerCase().includes("sales") ||
          label.toLowerCase().includes("basket") ||
          label.toLowerCase().includes("returns") ||
          label.toLowerCase().includes("voids") ||
          label.toLowerCase().includes("target") ||
          label.toLowerCase().includes("variance") ||
          label.toLowerCase().includes("projected") ||
          label.toLowerCase().includes("collected") ||
          label.toLowerCase().includes("expense")
            ? formatCurrency(value)
            : formatCompact(value)}
        </p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
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
    <Card className="rounded-lg border-border/60 bg-background shadow-sm sm:rounded-xl">
      <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-2 sm:p-4 sm:pt-2">{children}</CardContent>
    </Card>
  );
}

function ChartLoading({ height = 220 }: { height?: number }) {
  return (
    <div
      aria-label="Loading chart"
      role="status"
      className="rounded-xl border border-dashed border-border/70 bg-muted/20"
      style={{ height }}
    />
  );
}

const TrendChart = dynamic(
  () => import("./DashboardCharts").then((module) => module.DashboardTrendChart),
  { ssr: false, loading: () => <ChartLoading /> },
);

const RankedBarsChart = dynamic(
  () => import("./DashboardCharts").then((module) => module.DashboardRankedBarsChart),
  { ssr: false, loading: () => <ChartLoading /> },
);

const PaymentMixChart = dynamic(
  () => import("./DashboardCharts").then((module) => module.DashboardPaymentMixChart),
  { ssr: false, loading: () => <ChartLoading /> },
);

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

  return (
    <div className="space-y-4">
      <RankedBarsChart items={items} metricLabel={metricLabel} />
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

function FulfillmentList({ items }: { items: DashboardDataDto["fulfillmentMix"] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No fulfillment data yet.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.type} className="rounded-lg border px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="text-xs text-muted-foreground">
                {item.count} order{item.count === 1 ? "" : "s"} / {item.share.toFixed(0)}%
              </div>
            </div>
            <div className="text-right text-sm font-semibold">
              {formatCurrency(item.sales)}
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, item.share)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AddOnList({ items }: { items?: DashboardDataDto["topAddOns"] }) {
  if (!items?.length) {
    return <p className="text-sm text-muted-foreground">No add-ons sold in this window yet.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{item.name}</div>
            <div className="truncate text-xs text-muted-foreground">{item.parentProductName}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">{formatCurrency(item.revenue)}</div>
            <div className="text-xs text-muted-foreground">Qty {formatCompact(item.quantity)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function signalClass(status: "healthy" | "watch" | "critical" | "neutral") {
  if (status === "critical") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "watch") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "healthy") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-border bg-muted/20 text-muted-foreground";
}

function OperationalStatusPanel({ dashboard }: { dashboard: DashboardDataDto }) {
  const status = dashboard.operationalStatus;

  if (!status) {
    return null;
  }

  return (
    <Section
      title={status.title}
      description="Current floor health across drawers, approvals, sync, printers, stock, and kitchen flow."
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge variant="outline" className="rounded-full">
          <Activity className="size-3.5" />
          Updated {formatDateTime(status.updatedAt)}
        </Badge>
        <Badge
          variant="outline"
          className={`rounded-full ${status.syncHealth === "healthy" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
        >
          <ServerCog className="size-3.5" />
          Sync {status.syncHealth === "healthy" ? "healthy" : "needs review"}
        </Badge>
        <Badge
          variant="outline"
          className={`rounded-full ${status.offlineMode === "normal" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
        >
          <WifiOff className="size-3.5" />
          Offline queue {status.offlineMode === "normal" ? "clear" : "active"}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {status.signals.map((signal) => (
          <div key={signal.label} className={`rounded-lg border px-3 py-3 ${signalClass(signal.status)}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                  {signal.label}
                </div>
                <div className="mt-1 truncate text-xl font-black text-foreground">
                  {signal.value}
                </div>
              </div>
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            </div>
            <div className="mt-2 text-xs leading-5">{signal.helper}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function RestockAssistantPanel({ dashboard }: { dashboard: DashboardDataDto }) {
  const recommendations = dashboard.restockRecommendations ?? [];

  return (
    <Section
      title="Restock Assistant"
      description="Suggested reorder quantities from recent sales pace and current stock."
    >
      <div className="space-y-3">
        {recommendations.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            No restock recommendations right now.
          </div>
        ) : (
          recommendations.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/60 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <PackagePlus className="size-4 text-cyan-600" />
                    <div className="truncate text-sm font-semibold">{item.name}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.categoryName} / {item.supplierName ?? "No supplier history"}
                  </div>
                </div>
                <span className={attentionPillClass(item.riskLevel === "critical" ? "danger" : item.riskLevel === "low" ? "default" : "warning")}>
                  {item.riskLevel}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <WatchDetail label="On Hand" value={`${item.quantity}`} auxiliary={item.baseUnit} />
                <WatchDetail
                  label="Days Left"
                  value={item.remainingStockDays === null ? "No sales" : `${item.remainingStockDays}`}
                  auxiliary="at recent pace"
                />
                <WatchDetail
                  label="Reorder"
                  value={`${item.recommendedReorderQuantity}`}
                  auxiliary={item.baseUnit}
                />
                <WatchDetail
                  label="Est. Cost"
                  value={formatCurrency(item.estimatedReorderCost)}
                  auxiliary="purchase budget"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}

function VarianceInvestigationPanel({ dashboard }: { dashboard: DashboardDataDto }) {
  const investigations = dashboard.varianceInvestigations ?? [];

  if (!investigations.length) {
    return (
      <Section
        title="Variance Investigation"
        description="Closed drawer checks and explanation factors for cash differences."
      >
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
          No closed drawers to investigate today.
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Variance Investigation"
      description="Expected cash, counted cash, and likely explanation factors for recently closed drawers."
    >
      <div className="space-y-3">
        {investigations.map((item) => (
          <div key={item.id} className="rounded-lg border border-border/60 px-3 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Scale className="size-4 text-cyan-600" />
                  <div className="truncate text-sm font-semibold">{item.terminalName}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.cashierName} / Closed {formatDateTime(item.closedAt)}
                </div>
              </div>
              <span
                className={attentionPillClass(
                  item.severity === "critical"
                    ? "danger"
                    : item.severity === "watch"
                      ? "warning"
                      : "default",
                )}
              >
                {item.severity}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <WatchDetail label="Expected" value={formatCurrency(item.expectedCash)} auxiliary="cash drawer" />
              <WatchDetail label="Counted" value={formatCurrency(item.actualCash)} auxiliary="cash out" />
              <WatchDetail label="Variance" value={formatCurrency(item.variance)} auxiliary="over / short" />
              <WatchDetail label="Withdrawals" value={formatCurrency(item.withdrawals)} auxiliary="cash out during shift" />
              <WatchDetail label="Cash Sales" value={formatCurrency(item.cashSales)} auxiliary="cash receipts" />
              <WatchDetail label="Refunds" value={formatCurrency(item.refunds)} auxiliary="returned cash" />
              <WatchDetail label="Voids" value={formatCurrency(item.voids)} auxiliary="cancelled totals" />
              <WatchDetail
                label="Opened"
                value={item.openedAt ? formatDateTime(item.openedAt) : "Unknown"}
                auxiliary="session start"
              />
            </div>
            <div className="mt-3 rounded-md bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
              {item.explanation}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function RevenueGoalPanel({ dashboard }: { dashboard: DashboardDataDto }) {
  const goal = dashboard.revenueGoal;
  const [targetAmount, setTargetAmount] = useState(
    goal ? String(goal.targetAmount || "") : "",
  );
  const [notes, setNotes] = useState(goal?.notes ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!goal) {
    return null;
  }

  const progressWidth = `${Math.min(100, Math.max(0, goal.progressPercent))}%`;

  const saveGoal = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await upsertRevenueGoalAction({
        month: goal.month,
        targetAmount: Number(targetAmount || 0),
        notes,
      });

      setMessage(result.success ? "Goal saved." : result.error ?? "Failed to save goal.");
    });
  };

  return (
    <Section
      title="Revenue Goal"
      description="Current month target progress, daily run-rate, and projected month-end sales."
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Target" value={goal.targetAmount} hint={formatShortDate(goal.month)} />
          <MetricCard label="Actual Sales" value={goal.actualSales} tone="success" hint={`${goal.progressPercent.toFixed(1)}% complete`} />
          <MetricCard label="Target Variance" value={goal.varianceAmount} tone={goal.varianceAmount >= 0 ? "success" : "warning"} hint="Actual minus target" />
          <MetricCard label="Projected Sales" value={goal.projectedMonthEndSales} hint={`${goal.daysRemaining} day(s) remaining`} />
        </div>
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: progressWidth }} />
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <span>Run-rate: {formatCurrency(goal.dailyRunRate)} per day</span>
            <span>Needed: {formatCurrency(goal.requiredDailyRunRate)} per remaining day</span>
          </div>
        </div>

        {dashboard.role === "manager" ? (
          <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 sm:grid-cols-[1fr_1.4fr_auto]">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
              placeholder="Monthly target"
              className="h-10"
            />
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notes"
              className="h-10"
            />
            <Button type="button" onClick={saveGoal} disabled={isPending} className="h-10">
              <Target className="size-4" />
              Save
            </Button>
            {message ? (
              <p className="text-xs text-muted-foreground sm:col-span-3">{message}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Section>
  );
}

function WorkspaceHealth({ dashboard }: { dashboard: DashboardDataDto }) {
  if (!dashboard.adminWorkspaceStats?.length) {
    return null;
  }

  return (
    <Section
      title="Workspace Health"
      description="Platform-level counts that matter to the system owner."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {dashboard.adminWorkspaceStats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/60 bg-white px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {item.label}
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-foreground">
              {formatCompact(item.value)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{item.hint}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function AdminCompanyList({ dashboard }: { dashboard: DashboardDataDto }) {
  if (!dashboard.adminCompanies?.length) {
    return null;
  }

  return (
    <Section
      title="Company Watchlist"
      description="Companies with pending work, terminal readiness needs, or subscription records to review."
    >
      <div className="space-y-3">
        {dashboard.adminCompanies.map((company) => (
          <div
            key={company.id}
            className="rounded-[1.5rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-cyan-600" />
                  <div className="font-semibold text-foreground">{company.name}</div>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {company.ownerName ?? "No manager assigned"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full">
                  {company.riskCount} attention item{company.riskCount === 1 ? "" : "s"}
                </Badge>
                {company.pendingRequestCount > 0 ? (
                  <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                    {company.pendingRequestCount} pending request{company.pendingRequestCount === 1 ? "" : "s"}
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Terminals" value={company.terminalCount} />
              <MiniStat label="Live" value={company.activeTerminalCount} />
              <MiniStat label="Subscribed" value={company.activeSubscriptionCount} />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>Last activity {formatDateTime(company.lastActivityAt)}</span>
              <Button asChild variant="ghost" size="sm" className="rounded-xl">
                <Link href={`/companies/${company.id}`}>
                  Open
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function AdminTerminalWatch({ dashboard }: { dashboard: DashboardDataDto }) {
  if (!dashboard.adminTerminalWatch?.length) {
    return null;
  }

  return (
    <Section
      title="Terminal and Subscription Validity"
      description="Terminals that need permit renewal, direct owner attention, or subscription review when paid mode is enabled."
    >
      <div className="space-y-3">
        {dashboard.adminTerminalWatch.map((terminal) => (
          <div key={terminal.id} className="rounded-2xl border border-border/60 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold text-foreground">{terminal.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{terminal.companyName}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full capitalize">
                  {terminal.terminalStateLabel}
                </Badge>
                <span className={attentionPillClass(terminal.attentionLevel)}>
                  {terminal.attentionReason}
                </span>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <WatchDetail
                label="Subscription"
                value={terminal.subscriptionStatusLabel}
                auxiliary={`Ends ${formatShortDate(terminal.subscriptionExpiresAt)}`}
              />
              <WatchDetail
                label="Terminal Valid Until"
                value={formatShortDate(terminal.permitValidUntil)}
                auxiliary="Regulatory validity window"
              />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/80 px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold text-foreground">{formatCompact(value)}</div>
    </div>
  );
}

function WatchDetail({
  label,
  value,
  auxiliary,
}: {
  label: string;
  value: string;
  auxiliary: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/10 px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-semibold capitalize text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{auxiliary}</div>
    </div>
  );
}

function attentionPillClass(level: "default" | "warning" | "danger") {
  if (level === "danger") {
    return "inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700";
  }

  if (level === "warning") {
    return "inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700";
  }

  return "inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700";
}

function AlertsPanel({ dashboard }: { dashboard: DashboardDataDto }) {
  return (
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
  );
}

function RecentActivitySection({ dashboard }: { dashboard: DashboardDataDto }) {
  return (
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
  );
}

function AdminDashboard({ dashboard }: { dashboard: DashboardDataDto }) {
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <WorkspaceHealth dashboard={dashboard} />
        <AlertsPanel dashboard={dashboard} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminCompanyList dashboard={dashboard} />
        <AdminTerminalWatch dashboard={dashboard} />
      </div>

      <RecentActivitySection dashboard={dashboard} />
    </>
  );
}

function OperationsDashboard({ dashboard }: { dashboard: DashboardDataDto }) {
  const isCashier = dashboard.role === "cashier";

  return (
    <>
      {isCashier ? (
        <Section title="Quick Actions" description="Common cashier paths for the current shift.">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild className="h-10 justify-start rounded-lg">
              <Link href="/pos"><ShoppingCart className="size-4" /> New Sale</Link>
            </Button>
            <Button asChild variant="outline" className="h-10 justify-start rounded-lg">
              <Link href="/reports/sales"><Receipt className="size-4" /> History</Link>
            </Button>
            <Button asChild variant="outline" className="h-10 justify-start rounded-lg">
              <Link href="/reports/documents"><Receipt className="size-4" /> Reprint</Link>
            </Button>
            <Button asChild variant="outline" className="h-10 justify-start rounded-lg">
              <Link href="/pos"><Wallet className="size-4" /> Cash In/Out</Link>
            </Button>
          </div>
        </Section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.7fr_0.7fr]">
        <Section title="7-Day Trend" description="Daily sales and transaction pace.">
          <TrendChart data={dashboard.trend} />
        </Section>
        <Section title="Fulfillment Mix" description="Order types for today.">
          <FulfillmentList items={dashboard.fulfillmentMix} />
        </Section>
        <AlertsPanel dashboard={dashboard} />
      </div>

      <OperationalStatusPanel dashboard={dashboard} />

      <RevenueGoalPanel dashboard={dashboard} />

      {dashboard.role === "manager" ? (
        <VarianceInvestigationPanel dashboard={dashboard} />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {dashboard.restockRecommendations ? (
          <RestockAssistantPanel dashboard={dashboard} />
        ) : null}

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

        {dashboard.topConfiguredProducts ? (
          <Section title="Configured Items" description="Best configured products by revenue.">
            <ProductList items={dashboard.topConfiguredProducts} quantityLabel="Sold" />
          </Section>
        ) : null}

        <Section title="Top Add-ons" description="Most useful add-on options by revenue.">
          <AddOnList items={dashboard.topAddOns} />
        </Section>

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

      <div className="grid gap-4 xl:grid-cols-[0.65fr_1.35fr]">
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

        <RecentActivitySection dashboard={dashboard} />
      </div>

      {dashboard.recentInvoices ? (
        <Section title="Recent Receipts" description="Most recent invoices relevant to your role and scope.">
          <div className="space-y-3">
            {dashboard.recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex flex-col gap-3 rounded-2xl border border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-foreground">
                    Invoice #{invoice.invoiceNumber} - {invoice.customerName}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {invoice.terminalName} - {invoice.status}
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
                      <Link href="/reports/sales">
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
    </>
  );
}

export function DashboardScreen({ dashboard }: { dashboard: DashboardDataDto }) {
  const primaryAction =
    dashboard.billingRestriction?.isRestricted
      ? dashboard.role === "manager"
        ? {
            href: dashboard.companyId
              ? `/companies/${dashboard.companyId}/subscription`
              : "/dashboard",
            label: "Review Subscription",
            icon: Clock3,
          }
        : { href: "/dashboard", label: "View Dashboard", icon: Building2 }
      : dashboard.role === "admin"
      ? { href: "/companies", label: "Manage Companies", icon: Building2 }
      : { href: "/pos", label: "Open POS", icon: ShoppingCart };
  const secondaryAction =
    dashboard.billingRestriction?.isRestricted
      ? null
      : dashboard.role === "cashier"
      ? null
      : dashboard.role === "admin"
        ? { href: "/subscriptions", label: "Review Subscriptions", icon: Clock3 }
        : { href: "/reports", label: "Open Reports", icon: Receipt };

  return (
    <div className="space-y-4 sm:space-y-6">
      {dashboard.billingRestriction?.isRestricted ? (
        <Card className="border-amber-300 bg-amber-50 text-amber-950 shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                  Billing Restriction
                </div>
                <div className="mt-2 text-lg font-bold">
                  Terminal access is suspended
                </div>
                <div className="mt-1 text-sm leading-6 text-amber-900/90">
                  {dashboard.billingRestriction.reason}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {dashboard.billingRestriction.affectedAreas.map((item) => (
                  <Badge key={item} variant="outline" className="rounded-full border-amber-300 bg-amber-100 text-amber-900">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-xl border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.2),_transparent_32%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.92))] shadow-sm sm:rounded-[2rem]">
        <CardContent className="p-4 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2 sm:space-y-3">
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
                <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">
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
              <Button asChild className="h-11 rounded-xl sm:h-10">
                <Link href={primaryAction.href}>
                  <primaryAction.icon className="size-4" />
                  {primaryAction.label}
                </Link>
              </Button>
              {secondaryAction ? (
                <Button asChild variant="outline" className="h-11 rounded-xl sm:h-10">
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

      {dashboard.role === "admin" ? (
        <AdminDashboard dashboard={dashboard} />
      ) : (
        <OperationsDashboard dashboard={dashboard} />
      )}
    </div>
  );
}
