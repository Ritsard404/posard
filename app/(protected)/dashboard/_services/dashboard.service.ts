import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlatformBillingMode, isPlatformBillingFree } from "@/lib/billing-access";
import { REPORT_TIME_ZONE } from "@/lib/report-date-format";
import { createClient } from "@/lib/supabase/server";
import { buildRestockRecommendations } from "../../_services/inventory-restock.service";
import type {
  DashboardDataDto,
  DashboardFulfillmentMixDto,
  DashboardOperationalSignalDto,
  DashboardOperationalStatusDto,
  DashboardVarianceInvestigationDto,
  DashboardViewerDto,
} from "./_dto/dashboard.dto";

const DASHBOARD_RECENT_LIMIT = 6;
const DASHBOARD_LOW_STOCK_SCAN_LIMIT = 50;
const DASHBOARD_RESTOCK_LIMIT = 12;
const DASHBOARD_TOP_PRODUCT_LIMIT = 5;
const DASHBOARD_TOP_ADDON_LIMIT = 5;

type AggregateNumber = Prisma.Decimal | number | bigint | null;

type TrendAggregateRow = {
  dayKey: string;
  sales: AggregateNumber;
  transactions: AggregateNumber;
};

type AddOnAggregateRow = {
  id: string;
  name: string;
  parentProductName: string;
  quantity: AggregateNumber;
  revenue: AggregateNumber;
};

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function getPaymentMethodName(name: string | null) {
  return name?.trim() || "Unlabeled payment method";
}

function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return startOfDay(date);
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return endOfDay(date);
}

function hasDatePassed(value: Date | null | undefined) {
  return value ? value.getTime() < startOfDay().getTime() : false;
}

function isDateWithinDays(value: Date | null | undefined, days: number) {
  if (!value) {
    return false;
  }

  const now = startOfDay();
  const end = daysFromNow(days);
  return value.getTime() >= now.getTime() && value.getTime() <= end.getTime();
}

function formatDayLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: REPORT_TIME_ZONE,
  }).format(value);
}

function formatDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function buildTrend(rows: TrendAggregateRow[], days = 7) {
  const labels = Array.from({ length: days }, (_, index) => {
    const date = daysAgo(days - index - 1);
    return {
      key: formatDateKey(date),
      label: formatDayLabel(date),
      sales: 0,
      transactions: 0,
    };
  });

  const map = new Map(labels.map((item) => [item.key, item]));

  for (const row of rows) {
    const bucket = map.get(row.dayKey);
    if (!bucket) {
      continue;
    }

    bucket.sales = toNumber(row.sales);
    bucket.transactions = toNumber(row.transactions);
  }

  return labels;
}

const fulfillmentLabels: Record<DashboardFulfillmentMixDto["type"], string> = {
  WALK_IN: "Walk-in",
  DINE_IN: "Dine-in",
  TAKE_OUT: "Take-out",
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
};

function calculateInvoiceNet(invoice: {
  totalAmount: unknown;
  discountAmount: unknown;
  returnedAmount: unknown;
}) {
  return (
    toNumber(invoice.totalAmount) -
    toNumber(invoice.discountAmount) -
    toNumber(invoice.returnedAmount)
  );
}

function calculateNetFromSums(sums: {
  totalAmount?: unknown;
  discountAmount?: unknown;
  returnedAmount?: unknown;
} | null | undefined) {
  return (
    toNumber(sums?.totalAmount) -
    toNumber(sums?.discountAmount) -
    toNumber(sums?.returnedAmount)
  );
}

function getVarianceSeverity(variance: number): DashboardVarianceInvestigationDto["severity"] {
  const absoluteVariance = Math.abs(variance);

  if (absoluteVariance >= 500) {
    return "critical";
  }

  if (absoluteVariance >= 50) {
    return "watch";
  }

  return "balanced";
}

function explainVariance(input: {
  variance: number;
  refunds: number;
  voids: number;
  withdrawals: number;
  offlineIssues: number;
  pendingApprovals: number;
}) {
  const factors: string[] = [];

  if (Math.abs(input.variance) < 50) {
    factors.push("drawer count is within the normal tolerance band");
  } else if (input.variance > 0) {
    factors.push("drawer is over expected cash");
  } else {
    factors.push("drawer is short against expected cash");
  }

  if (input.refunds > 0) {
    factors.push("refunds reduced expected cash");
  }

  if (input.voids > 0) {
    factors.push("voided or cancelled receipts need review");
  }

  if (input.withdrawals > 0) {
    factors.push("cash withdrawals were recorded during the shift");
  }

  if (input.offlineIssues > 0) {
    factors.push("offline sync issues may affect transaction completeness");
  }

  if (input.pendingApprovals > 0) {
    factors.push("pending approvals may explain unfinished adjustments");
  }

  return factors.join("; ");
}

function buildFulfillmentMix(
  rows: Array<{
    fulfillmentType: DashboardFulfillmentMixDto["type"];
    _count: { _all: number };
    _sum: {
      totalAmount: unknown;
      discountAmount: unknown;
      returnedAmount: unknown;
    };
  }>,
): DashboardFulfillmentMixDto[] {
  const buckets = new Map<DashboardFulfillmentMixDto["type"], DashboardFulfillmentMixDto>(
    (Object.keys(fulfillmentLabels) as DashboardFulfillmentMixDto["type"][]).map((type) => [
      type,
      { type, label: fulfillmentLabels[type], count: 0, sales: 0, share: 0 },
    ]),
  );

  for (const row of rows) {
    const bucket = buckets.get(row.fulfillmentType) ?? buckets.get("WALK_IN")!;
    bucket.count += row._count._all;
    bucket.sales += calculateNetFromSums(row._sum);
  }

  const totalCount = [...buckets.values()].reduce((sum, bucket) => sum + bucket.count, 0);
  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    share: totalCount > 0 ? (bucket.count / totalCount) * 100 : 0,
  }));
}

function buildOperationalSignal(
  label: string,
  value: number | string,
  helper: string,
  status: DashboardOperationalSignalDto["status"],
): DashboardOperationalSignalDto {
  return { label, value, helper, status };
}

function buildOperationalStatus(input: {
  activeCashiers: number;
  activeTerminals: number;
  openSessions: number;
  configuredPrinters: number;
  pendingApprovals: number;
  pendingSyncIssues: number;
  failedSyncIssues: number;
  activeKitchenTickets: number;
  lowStockCount: number;
  staleCustomerDisplays: number;
}): DashboardOperationalStatusDto {
  const syncIssues = input.pendingSyncIssues + input.failedSyncIssues;

  return {
    title: "Live Store Status",
    updatedAt: new Date(),
    internetStatus: "unknown",
    offlineMode: syncIssues > 0 ? "attention" : "normal",
    syncHealth: input.failedSyncIssues > 0 ? "attention" : "healthy",
    signals: [
      buildOperationalSignal(
        "Active cashiers",
        input.activeCashiers,
        "Enabled cashier accounts that can operate today.",
        input.activeCashiers > 0 ? "healthy" : "watch",
      ),
      buildOperationalSignal(
        "Active terminals",
        input.activeTerminals,
        "Enabled terminal records for this company.",
        input.activeTerminals > 0 ? "healthy" : "critical",
      ),
      buildOperationalSignal(
        "Open drawers",
        input.openSessions,
        "Cashier sessions currently open.",
        input.openSessions > 0 ? "healthy" : "watch",
      ),
      buildOperationalSignal(
        "Pending approvals",
        input.pendingApprovals,
        "Manager approvals waiting for a decision.",
        input.pendingApprovals > 0 ? "watch" : "healthy",
      ),
      buildOperationalSignal(
        "Sync queue",
        syncIssues,
        `${input.pendingSyncIssues} pending, ${input.failedSyncIssues} failed sync issue(s).`,
        input.failedSyncIssues > 0 ? "critical" : syncIssues > 0 ? "watch" : "healthy",
      ),
      buildOperationalSignal(
        "Printer setup",
        `${input.configuredPrinters}/${input.activeTerminals}`,
        "Active terminals with printer configuration.",
        input.activeTerminals === 0 || input.configuredPrinters < input.activeTerminals ? "watch" : "healthy",
      ),
      buildOperationalSignal(
        "Kitchen queue",
        input.activeKitchenTickets,
        "Queued or preparing tickets still in progress.",
        input.activeKitchenTickets > 0 ? "watch" : "healthy",
      ),
      buildOperationalSignal(
        "Low stock",
        input.lowStockCount,
        "Tracked products at or below the dashboard stock threshold.",
        input.lowStockCount > 0 ? "watch" : "healthy",
      ),
      buildOperationalSignal(
        "Customer displays",
        input.staleCustomerDisplays,
        "Active terminals with no recent customer-display heartbeat.",
        input.staleCustomerDisplays > 0 ? "watch" : "healthy",
      ),
    ],
  };
}

async function getViewer(): Promise<DashboardViewerDto> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      companyId: true,
      role: true,
      fullName: true,
      email: true,
    },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  return {
    profileId: profile.id,
    companyId: profile.companyId,
    role: profile.role,
    fullName: profile.fullName,
    email: profile.email,
  };
}

export const dashboardService = {
  async getDashboard(): Promise<DashboardDataDto> {
    const viewer = await getViewer();
    const platformBillingMode = await getPlatformBillingMode();
    const billingIsFree = isPlatformBillingFree(platformBillingMode);
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const weekStart = daysAgo(6);
    const monthStart = daysAgo(29);
    const calendarMonthStart = new Date(todayStart);
    calendarMonthStart.setDate(1);
    const calendarMonthEnd = new Date(calendarMonthStart);
    calendarMonthEnd.setMonth(calendarMonthEnd.getMonth() + 1, 0);
    calendarMonthEnd.setHours(23, 59, 59, 999);
    const calendarMonthElapsedEnd =
      todayEnd < calendarMonthEnd ? todayEnd : calendarMonthEnd;
    const customerDisplayFreshAfter = new Date(Date.now() - 5 * 60 * 1000);

    if (viewer.role === "admin") {
      const expiringWindowEnd = daysFromNow(30);

      const [
        companiesCount,
        activeManagers,
        activeCashiers,
        activeTerminals,
        openSessions,
        pendingRegistrations,
        pendingRequests,
        activeSubscriptions,
        expiringSubscriptions,
        expiringPermits,
        companiesWithoutTerminals,
        terminalsWithoutSubscription,
        newCompaniesThisMonth,
        companies,
        terminalsNeedingAttention,
        auditLogs,
      ] = await Promise.all([
        prisma.company.count(),
        prisma.profile.count({ where: { role: "manager", status: "active" } }),
        prisma.profile.count({ where: { role: "cashier", status: "active" } }),
        prisma.posTerminalInfo.count({ where: { isActive: true } }),
        prisma.timestamp.count({ where: { timestampOut: null } }),
        prisma.registrationRequest.count({ where: { status: "pending" } }),
        prisma.terminalRequest.count({ where: { status: "pending" } }),
        prisma.terminalSubscription.count({ where: { status: "active" } }),
        billingIsFree
          ? Promise.resolve(0)
          : prisma.terminalSubscription.count({
              where: {
                status: "active",
                expiresAt: { gte: todayStart, lte: expiringWindowEnd },
              },
            }),
        prisma.posTerminalInfo.count({
          where: {
            validUntil: { gte: todayStart, lte: expiringWindowEnd },
          },
        }),
        prisma.company.count({ where: { posTerminals: { none: {} } } }),
        billingIsFree
          ? Promise.resolve(0)
          : prisma.posTerminalInfo.count({ where: { subscription: null } }),
        prisma.company.count({ where: { createdAt: { gte: monthStart, lte: todayEnd } } }),
        prisma.company.findMany({
          select: {
            id: true,
            name: true,
            updatedAt: true,
            users: {
              where: { role: "manager" },
              orderBy: [{ approvedAt: "asc" }, { createdAt: "asc" }],
              take: 1,
              select: { fullName: true, email: true },
            },
            terminalRequests: {
              where: { status: "pending" },
              select: { id: true },
            },
            auditLogs: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { createdAt: true },
            },
            posTerminals: {
              select: {
                id: true,
                isActive: true,
                validUntil: true,
                subscription: {
                  select: {
                    status: true,
                    expiresAt: true,
                  },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.posTerminalInfo.findMany({
          where: billingIsFree
            ? { validUntil: { lte: expiringWindowEnd } }
            : {
                OR: [
                  { subscription: null },
                  { subscription: { status: { in: ["pending", "expired", "suspended", "cancelled"] } } },
                  { subscription: { status: "active", expiresAt: { lte: expiringWindowEnd } } },
                  { validUntil: { lte: expiringWindowEnd } },
                ],
              },
          select: {
            id: true,
            posName: true,
            isActive: true,
            validUntil: true,
            company: { select: { name: true } },
            timestamps: {
              where: { timestampOut: null },
              select: { id: true },
            },
            subscription: {
              select: {
                status: true,
                expiresAt: true,
              },
            },
          },
          orderBy: { validUntil: "asc" },
          take: 8,
        }),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            actionType: true,
            createdAt: true,
            actorProfile: { select: { fullName: true, email: true } },
            posTerminal: { select: { posName: true } },
          },
        }),
      ]);

      const adminCompanies = companies
        .map((company) => {
          const activeTerminalCount = company.posTerminals.filter((terminal) => terminal.isActive).length;
          const activeSubscriptionCount = company.posTerminals.filter(
            (terminal) => terminal.subscription?.status === "active" && !hasDatePassed(terminal.subscription.expiresAt),
          ).length;
          const riskCount =
            company.posTerminals.filter(
              (terminal) =>
                (!billingIsFree &&
                  (!terminal.subscription ||
                    terminal.subscription.status !== "active" ||
                    hasDatePassed(terminal.subscription.expiresAt) ||
                    isDateWithinDays(terminal.subscription.expiresAt, 30))) ||
                isDateWithinDays(terminal.validUntil, 30),
            ).length + company.terminalRequests.length;

          return {
            id: company.id,
            name: company.name,
            ownerName: company.users[0]?.fullName ?? company.users[0]?.email ?? null,
            terminalCount: company.posTerminals.length,
            activeTerminalCount,
            activeSubscriptionCount,
            pendingRequestCount: company.terminalRequests.length,
            riskCount,
            lastActivityAt: company.auditLogs[0]?.createdAt ?? null,
          };
        })
        .sort((a, b) => b.riskCount - a.riskCount || a.name.localeCompare(b.name))
        .slice(0, 6);

      const adminTerminalWatch = terminalsNeedingAttention.map((terminal) => {
        const hasOpenSession = terminal.timestamps.length > 0;
        const hasExpiredSubscription =
          terminal.subscription?.status === "expired" ||
          terminal.subscription?.status === "cancelled" ||
          hasDatePassed(terminal.subscription?.expiresAt);
        const hasExpiredPermit = hasDatePassed(terminal.validUntil);

        let attentionLevel: "default" | "warning" | "danger" = "default";
        let attentionReason = "Ready";

        if (!billingIsFree && !terminal.subscription) {
          attentionLevel = "danger";
          attentionReason = "No subscription assigned";
        } else if (!billingIsFree && hasExpiredSubscription) {
          attentionLevel = "danger";
          attentionReason = "Subscription expired or inactive";
        } else if (hasExpiredPermit) {
          attentionLevel = "danger";
          attentionReason = "Terminal validity already expired";
        } else if (!billingIsFree && (terminal.subscription?.status === "pending" || terminal.subscription?.status === "suspended")) {
          attentionLevel = "warning";
          attentionReason = "Subscription needs admin review";
        } else if (!billingIsFree && isDateWithinDays(terminal.subscription?.expiresAt, 30)) {
          attentionLevel = "warning";
          attentionReason = "Subscription expires within 30 days";
        } else if (isDateWithinDays(terminal.validUntil, 30)) {
          attentionLevel = "warning";
          attentionReason = "Terminal permit expires within 30 days";
        }

        return {
          id: terminal.id,
          name: terminal.posName ?? "Unnamed terminal",
          companyName: terminal.company.name,
          terminalStateLabel: hasOpenSession ? "Open session" : terminal.isActive ? "Active" : "Inactive",
          subscriptionStatusLabel: terminal.subscription?.status ?? "unassigned",
          permitValidUntil: terminal.validUntil,
          subscriptionExpiresAt: terminal.subscription?.expiresAt ?? null,
          attentionLevel,
          attentionReason,
        };
      });

      return {
        role: viewer.role,
        viewerName: viewer.fullName ?? viewer.email,
        scopeLabel: "System owner overview",
        heroTitle: "System owner command center",
        heroDescription:
          billingIsFree
            ? "Watch company growth, terminal readiness, pending approvals, and the latest operational activity across POSard. Subscriptions are informational in free mode."
            : "Watch company growth, terminal subscription validity, pending approvals, and the latest operational activity across POSard.",
        summary: [
          { label: "Companies", value: companiesCount, hint: "Registered businesses on the platform" },
          { label: "Active Subscriptions", value: activeSubscriptions, tone: "success", hint: "Terminals with active plans" },
          { label: "Terminals Live", value: activeTerminals, hint: "Terminal records currently enabled" },
          {
            label: "Expiring in 30 Days",
            value: expiringSubscriptions + expiringPermits,
            tone: "warning",
            hint: billingIsFree ? "Terminal permits nearing expiry" : "Subscriptions or permits nearing expiry",
          },
          { label: "Pending Registration Requests", value: pendingRegistrations, tone: pendingRegistrations > 0 ? "warning" : "default", hint: "Merchant onboarding requests waiting for approval" },
          { label: "Pending Terminal Requests", value: pendingRequests, tone: pendingRequests > 0 ? "warning" : "default", hint: "Company requests needing review" },
        ],
        trend: [],
        paymentMix: [],
        fulfillmentMix: [],
        adminWorkspaceStats: [
          { label: "Active Managers", value: activeManagers, hint: "Approved managers with active accounts" },
          { label: "Active Cashiers", value: activeCashiers, hint: "Cashiers available across all companies" },
          { label: "Open Sessions", value: openSessions, hint: "Drawers currently open in the field" },
          { label: "New Companies", value: newCompaniesThisMonth, hint: "Companies onboarded in the last 30 days" },
          { label: "No Terminal Yet", value: companiesWithoutTerminals, hint: "Companies still missing their first terminal" },
          {
            label: billingIsFree ? "Free Mode" : "No Subscription",
            value: billingIsFree ? 0 : terminalsWithoutSubscription,
            hint: billingIsFree ? "Subscription issues are informational" : "Terminals that still need a plan",
          },
        ],
        adminCompanies,
        adminTerminalWatch,
        recentActivities: auditLogs.map((log) => ({
          id: log.id,
          title: log.actionType,
          description: `${log.actorProfile.fullName ?? log.actorProfile.email}${log.posTerminal ? ` - ${log.posTerminal.posName ?? "Unnamed terminal"}` : ""}`,
          occurredAt: log.createdAt,
        })),
        alerts: [
          ...(pendingRegistrations > 0
            ? [{ id: "pending-registrations", title: "Pending registration requests", description: `${pendingRegistrations} registration request(s) still waiting for approval.`, tone: "warning" as const }]
            : []),
          ...(pendingRequests > 0
            ? [{ id: "pending-requests", title: "Terminal requests pending", description: `${pendingRequests} terminal request(s) need review.`, tone: "info" as const }]
            : []),
          ...(expiringSubscriptions > 0
            ? [{ id: "expiring-subscriptions", title: "Subscriptions expiring soon", description: `${expiringSubscriptions} active subscription(s) expire within 30 days.`, tone: "warning" as const }]
            : []),
          ...(expiringPermits > 0
            ? [{ id: "expiring-permits", title: "Terminal permits nearing validity end", description: `${expiringPermits} terminal registration(s) need renewal within 30 days.`, tone: "warning" as const }]
            : []),
        ],
      };
    }

    const companyId = viewer.companyId;
    if (!companyId) {
      throw new Error("No company assigned to this account.");
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    if (!company) {
      throw new Error("Company not found.");
    }

    const billingRestriction = null;

    const dashboardStartedAt = Date.now();
    const baseWhere = { posTerminal: { companyId } } as const;
    const invoiceScopeWhere =
      viewer.role === "cashier"
        ? { ...baseWhere, cashierId: viewer.profileId }
        : baseWhere;
    const cashierTrendFilter =
      viewer.role === "cashier"
        ? Prisma.sql`AND invoice.cashier_id = ${viewer.profileId}::uuid`
        : Prisma.empty;

    const [
      todayInvoiceStats,
      weekTrendRows,
      paymentRows,
      fulfillmentRows,
      topProductRows,
      topConfiguredProductRows,
      topAddOnRows,
      terminals,
      terminalSalesRows,
      auditLogs,
      todayOpenSessions,
      lowStockProducts,
      recentInvoices,
      latestShift,
      debtOutstanding,
      debtDueToday,
      debtOverdue,
      debtCollectedToday,
      activeCashiers,
      pendingOperationalApprovals,
      pendingSyncIssues,
      failedSyncIssues,
      activeKitchenTickets,
      restockProducts,
      soldItems,
      recentlyClosedShifts,
      debtPaymentsToday,
      revenueGoal,
      revenueGoalSales,
    ] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        where: { ...invoiceScopeWhere, createdAt: { gte: todayStart, lte: todayEnd } },
        _count: { _all: true },
        _sum: {
          totalAmount: true,
          discountAmount: true,
          returnedAmount: true,
        },
      }),
      prisma.$queryRaw<TrendAggregateRow[]>(Prisma.sql`
        SELECT
          to_char(invoice.created_at AT TIME ZONE ${REPORT_TIME_ZONE}, 'YYYY-MM-DD') AS "dayKey",
          COALESCE(
            SUM(invoice.total_amount - COALESCE(invoice.discount_amount, 0) - COALESCE(invoice.returned_amount, 0)),
            0
          ) AS sales,
          COUNT(*)::int AS transactions
        FROM public.invoice AS invoice
        INNER JOIN public.pos_terminal_info AS terminal
          ON terminal.uuid_pos_terminal = invoice.uuid_pos_terminal
        WHERE terminal.company_id = ${companyId}::uuid
          AND invoice.created_at >= ${weekStart}
          AND invoice.created_at <= ${todayEnd}
          AND invoice.status = 'PAID'
          ${cashierTrendFilter}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      prisma.ePayment.groupBy({
        by: ["saleTypeId"],
        where: {
          invoice: {
            ...invoiceScopeWhere,
            createdAt: { gte: todayStart, lte: todayEnd },
            status: "PAID",
          },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.invoice.groupBy({
        by: ["fulfillmentType"],
        where: {
          ...invoiceScopeWhere,
          createdAt: { gte: todayStart, lte: todayEnd },
          status: "PAID",
        },
        _count: { _all: true },
        _sum: {
          totalAmount: true,
          discountAmount: true,
          returnedAmount: true,
        },
      }),
      prisma.item.groupBy({
        by: ["productId"],
        where: {
          invoice: {
            posTerminal: { companyId },
            createdAt: { gte: monthStart, lte: todayEnd },
            status: { in: ["PAID", "RETURNED"] },
          },
          status: { not: "VOID" },
        },
        _sum: { qty: true, subTotal: true },
        orderBy: { _sum: { subTotal: "desc" } },
        take: DASHBOARD_TOP_PRODUCT_LIMIT,
      }),
      prisma.item.groupBy({
        by: ["productId"],
        where: {
          invoice: {
            posTerminal: { companyId },
            createdAt: { gte: monthStart, lte: todayEnd },
            status: { in: ["PAID", "RETURNED"] },
          },
          status: { not: "VOID" },
          OR: [{ product: { isConfigurable: true } }, { selections: { some: {} } }],
        },
        _sum: { qty: true, subTotal: true },
        orderBy: { _sum: { subTotal: "desc" } },
        take: DASHBOARD_TOP_PRODUCT_LIMIT,
      }),
      prisma.$queryRaw<AddOnAggregateRow[]>(Prisma.sql`
        SELECT
          MIN(selection.uuid_order_item_selection::text) AS id,
          selection.option_name AS name,
          product.name AS "parentProductName",
          COALESCE(SUM(selection.quantity * item.qty), 0) AS quantity,
          COALESCE(SUM(selection.price_delta * selection.quantity * item.qty), 0) AS revenue
        FROM public.order_item_selection AS selection
        INNER JOIN public.item AS item
          ON item.uuid_item = selection.order_item_id
        INNER JOIN public.product AS product
          ON product.uuid_product = item.uuid_product
        INNER JOIN public.invoice AS invoice
          ON invoice.uuid_invoice = item.uuid_invoice
        INNER JOIN public.pos_terminal_info AS terminal
          ON terminal.uuid_pos_terminal = invoice.uuid_pos_terminal
        WHERE terminal.company_id = ${companyId}::uuid
          AND invoice.created_at >= ${monthStart}
          AND invoice.created_at <= ${todayEnd}
          AND invoice.status IN ('PAID', 'RETURNED')
          AND item.status <> 'VOID'
          AND selection.modifier_group_type = 'ADDON'
          AND selection.option_name IS NOT NULL
        GROUP BY selection.option_name, product.name
        ORDER BY revenue DESC, quantity DESC
        LIMIT ${DASHBOARD_TOP_ADDON_LIMIT}
      `),
      prisma.posTerminalInfo.findMany({
        where: { companyId },
        select: {
          id: true,
          posName: true,
          isActive: true,
          printerName: true,
          printerDisplayName: true,
          printerDriver: true,
          customerDisplayState: { select: { updatedAt: true } },
          timestamps: { where: { timestampOut: null }, select: { id: true } },
        },
        orderBy: { posName: "asc" },
      }),
      prisma.invoice.groupBy({
        by: ["posTerminalId"],
        where: {
          ...baseWhere,
          createdAt: { gte: todayStart, lte: todayEnd },
          status: "PAID",
        },
        _count: { _all: true },
        _sum: {
          totalAmount: true,
          discountAmount: true,
          returnedAmount: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { companyId },
        take: DASHBOARD_RECENT_LIMIT,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          actionType: true,
          createdAt: true,
          actorProfile: { select: { fullName: true, email: true } },
          posTerminal: { select: { posName: true } },
        },
      }),
      prisma.timestamp.count({
        where: {
          posTerminal: { companyId },
          timestampOut: null,
        },
      }),
      prisma.product.findMany({
        where: {
          companyId,
          trackInventory: true,
          OR: [{ quantity: { lte: 10 } }, { reorderPoint: { not: null } }],
          isDeleted: false,
        },
        take: DASHBOARD_LOW_STOCK_SCAN_LIMIT,
        orderBy: { quantity: "asc" },
        select: {
          id: true,
          name: true,
          quantity: true,
          reorderPoint: true,
          price: true,
          category: { select: { categoryName: true } },
        },
      }),
      prisma.invoice.findMany({
        where: invoiceScopeWhere,
        take: DASHBOARD_RECENT_LIMIT,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          totalAmount: true,
          fulfillmentType: true,
          status: true,
          createdAt: true,
          posTerminal: { select: { posName: true } },
        },
      }),
      prisma.timestamp.findFirst({
        where:
          viewer.role === "cashier"
            ? { cashierId: viewer.profileId }
            : { posTerminal: { companyId } },
        orderBy: { createdAt: "desc" },
        select: {
          timestampIn: true,
          timestampOut: true,
          cashInDrawerAmount: true,
          withdrawnDrawerAmount: true,
          posTerminal: { select: { posName: true } },
        },
      }),
      prisma.customerDebt.aggregate({
        where: {
          companyId,
          status: { in: ["UNPAID", "PARTIAL"] },
        },
        _sum: { remainingAmount: true },
      }),
      prisma.customerDebt.aggregate({
        where: {
          companyId,
          status: { in: ["UNPAID", "PARTIAL"] },
          dueDate: { gte: todayStart, lte: todayEnd },
        },
        _sum: { remainingAmount: true },
      }),
      prisma.customerDebt.aggregate({
        where: {
          companyId,
          status: { in: ["UNPAID", "PARTIAL"] },
          dueDate: { lt: todayStart },
        },
        _sum: { remainingAmount: true },
      }),
      prisma.customerDebtPayment.aggregate({
        where: {
          companyId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),
      prisma.profile.count({
        where: { companyId, role: "cashier", status: "active" },
      }),
      prisma.approvalRequest.count({
        where: { companyId, status: "pending" },
      }),
      prisma.offlineSyncIssue.count({
        where: { companyId, syncStatus: { in: ["pending", "syncing"] } },
      }),
      prisma.offlineSyncIssue.count({
        where: { companyId, syncStatus: "failed" },
      }),
      prisma.kitchenTicket.count({
        where: { companyId, status: { in: ["queued", "preparing"] } },
      }),
      prisma.product.findMany({
        where: {
          companyId,
          trackInventory: true,
          isDeleted: false,
          OR: [
            { quantity: { lte: 10 } },
            { reorderPoint: { not: null } },
            { stockMovements: { none: {} } },
          ],
        },
        orderBy: [{ quantity: "asc" }, { name: "asc" }],
        take: DASHBOARD_RESTOCK_LIMIT,
        select: {
          id: true,
          name: true,
          quantity: true,
          baseUnit: true,
          cost: true,
          price: true,
          reorderPoint: true,
          preferredSupplier: { select: { name: true } },
          category: { select: { categoryName: true } },
          purchaseOrderItems: {
            orderBy: { purchaseOrder: { createdAt: "desc" } },
            take: 1,
            select: {
              purchaseOrder: {
                select: {
                  supplier: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.item.groupBy({
        by: ["productId"],
        where: {
          invoice: {
            posTerminal: { companyId },
            createdAt: { gte: monthStart, lte: todayEnd },
            status: { in: ["PAID", "RETURNED"] },
          },
          status: { not: "VOID" },
        },
        _sum: { qty: true },
      }),
      prisma.timestamp.findMany({
        where: {
          posTerminal: { companyId },
          timestampOut: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { timestampOut: "desc" },
        take: DASHBOARD_RECENT_LIMIT,
        select: {
          id: true,
          timestampIn: true,
          timestampOut: true,
          cashInDrawerAmount: true,
          cashOutDrawerAmount: true,
          withdrawnDrawerAmount: true,
          cashier: { select: { fullName: true, email: true } },
          posTerminal: { select: { posName: true } },
        },
      }),
      prisma.customerDebtPayment.findMany({
        where: {
          companyId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        select: {
          timestampId: true,
          method: true,
          amount: true,
        },
      }),
      prisma.revenueGoal.findUnique({
        where: {
          uk_revenue_goal_company_month: {
            companyId,
            month: calendarMonthStart,
          },
        },
        select: { targetAmount: true, notes: true },
      }),
      prisma.invoice.aggregate({
        where: {
          ...baseWhere,
          createdAt: { gte: calendarMonthStart, lte: calendarMonthElapsedEnd },
          status: "PAID",
        },
        _sum: { totalAmount: true, discountAmount: true, returnedAmount: true },
      }),
    ]);

    const paymentSaleTypeIds = [...new Set(paymentRows.map((row) => row.saleTypeId))];
    const topProductIds = [
      ...new Set([
        ...topProductRows.map((row) => row.productId),
        ...topConfiguredProductRows.map((row) => row.productId),
      ]),
    ];
    const [paymentSaleTypes, topProductRecords] = await Promise.all([
      paymentSaleTypeIds.length > 0
        ? prisma.saleType.findMany({
            where: { id: { in: paymentSaleTypeIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([] as Array<{ id: string; name: string | null }>),
      topProductIds.length > 0
        ? prisma.product.findMany({
            where: { id: { in: topProductIds } },
            select: {
              id: true,
              name: true,
              category: { select: { categoryName: true } },
            },
          })
        : Promise.resolve([] as Array<{ id: string; name: string; category: { categoryName: string } }>),
    ]);

    const todayStatsByStatus = new Map(todayInvoiceStats.map((row) => [row.status, row]));
    const paidInvoiceStats = todayStatsByStatus.get("PAID");
    const paidTransactionCount = paidInvoiceStats?._count._all ?? 0;
    const salesToday = calculateNetFromSums(paidInvoiceStats?._sum);
    const returnsToday = toNumber(todayStatsByStatus.get("RETURNED")?._sum.returnedAmount);
    const voidsToday =
      toNumber(todayStatsByStatus.get("VOID")?._sum.totalAmount) +
      toNumber(todayStatsByStatus.get("CANCELLED")?._sum.totalAmount);

    const saleTypeNameById = new Map(paymentSaleTypes.map((saleType) => [saleType.id, saleType.name]));
    const paymentMap = new Map<string, number>();
    for (const row of paymentRows) {
      const key = getPaymentMethodName(saleTypeNameById.get(row.saleTypeId) ?? null);
      paymentMap.set(key, (paymentMap.get(key) ?? 0) + toNumber(row._sum.amount));
    }

    const productById = new Map(topProductRecords.map((product) => [product.id, product]));
    const topProducts = topProductRows.flatMap((row) => {
      const product = productById.get(row.productId);
      if (!product) {
        return [];
      }

      return [{
        id: product.id,
        name: product.name,
        category: product.category.categoryName,
        quantity: toNumber(row._sum.qty),
        sales: toNumber(row._sum.subTotal),
      }];
    });
    const topConfiguredProducts = topConfiguredProductRows.flatMap((row) => {
      const product = productById.get(row.productId);
      if (!product) {
        return [];
      }

      return [{
        id: product.id,
        name: product.name,
        category: product.category.categoryName,
        quantity: toNumber(row._sum.qty),
        sales: toNumber(row._sum.subTotal),
      }];
    });
    const topAddOns = topAddOnRows.map((row) => ({
      id: row.id,
      name: row.name,
      parentProductName: row.parentProductName,
      quantity: toNumber(row.quantity),
      revenue: toNumber(row.revenue),
    }));

    const terminalSalesById = new Map(terminalSalesRows.map((row) => [row.posTerminalId, row]));

    const commonData = {
      trend: buildTrend(weekTrendRows),
      paymentMix: [...paymentMap.entries()]
        .map(([label, amount]) => ({ label, amount }))
        .sort((a, b) => b.amount - a.amount),
      fulfillmentMix: buildFulfillmentMix(fulfillmentRows),
      recentActivities: auditLogs.map((log) => ({
        id: log.id,
        title: log.actionType,
        description: `${log.actorProfile.fullName ?? log.actorProfile.email}${log.posTerminal ? ` - ${log.posTerminal.posName ?? "Unnamed terminal"}` : ""}`,
        occurredAt: log.createdAt,
      })),
      recentInvoices: recentInvoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        terminalName: invoice.posTerminal.posName ?? "Unnamed terminal",
        amount: toNumber(invoice.totalAmount),
        status: invoice.status,
        createdAt: invoice.createdAt,
      })),
    };

    const activeTerminalCount = terminals.filter((terminal) => terminal.isActive).length;
    const configuredPrinterCount = terminals.filter(
      (terminal) =>
        terminal.isActive &&
        Boolean(terminal.printerName ?? terminal.printerDisplayName ?? terminal.printerDriver),
    ).length;
    const staleCustomerDisplayCount = terminals.filter(
      (terminal) =>
        terminal.isActive &&
        (!terminal.customerDisplayState ||
          terminal.customerDisplayState.updatedAt.getTime() < customerDisplayFreshAfter.getTime()),
    ).length;
    const thresholdLowStockProducts = lowStockProducts
      .filter((product) => {
        const quantity = toNumber(product.quantity);
        return quantity > 0 && quantity <= toNumber(product.reorderPoint ?? 10);
      })
      .slice(0, 5);
    const operationalStatus = buildOperationalStatus({
      activeCashiers,
      activeTerminals: activeTerminalCount,
      openSessions: todayOpenSessions,
      configuredPrinters: configuredPrinterCount,
      pendingApprovals: pendingOperationalApprovals,
      pendingSyncIssues,
      failedSyncIssues,
      activeKitchenTickets,
      lowStockCount: thresholdLowStockProducts.length,
      staleCustomerDisplays: staleCustomerDisplayCount,
    });
    const soldQuantityByProduct = new Map(
      soldItems.map((item) => [item.productId, toNumber(item._sum.qty)]),
    );
    const restockRecommendations = buildRestockRecommendations(
      restockProducts.map((product) => ({
        id: product.id,
        name: product.name,
        categoryName: product.category.categoryName,
        quantity: toNumber(product.quantity),
        baseUnit: product.baseUnit,
        cost: toNumber(product.cost),
        price: toNumber(product.price),
        soldQuantity: soldQuantityByProduct.get(product.id) ?? 0,
        reorderPoint: product.reorderPoint === null ? null : toNumber(product.reorderPoint),
        supplierName: product.preferredSupplier?.name ?? product.purchaseOrderItems[0]?.purchaseOrder.supplier.name ?? null,
      })),
    ).slice(0, 6);
    const debtCashByTimestamp = new Map<string, number>();
    for (const payment of debtPaymentsToday) {
      if (!payment.timestampId || payment.method.toUpperCase() !== "CASH") {
        continue;
      }

      debtCashByTimestamp.set(
        payment.timestampId,
        (debtCashByTimestamp.get(payment.timestampId) ?? 0) + toNumber(payment.amount),
      );
    }
    const shiftIds = recentlyClosedShifts.map((shift) => shift.id);
    let shiftRefundRows: Array<{
      sourceTimestampId: string | null;
      _sum: { returnedAmount: AggregateNumber };
    }> = [];
    let shiftVoidRows: Array<{
      sourceTimestampId: string | null;
      _sum: { totalAmount: AggregateNumber };
    }> = [];
    let shiftCashRows: Array<{
      sourceTimestampId: string | null;
      _sum: {
        cashTendered: AggregateNumber;
        changeAmount: AggregateNumber;
        returnedAmount: AggregateNumber;
      };
    }> = [];

    if (shiftIds.length > 0) {
      [shiftRefundRows, shiftVoidRows, shiftCashRows] = await Promise.all([
        prisma.invoice.groupBy({
          by: ["sourceTimestampId"],
          where: {
            ...baseWhere,
            sourceTimestampId: { in: shiftIds },
            status: "RETURNED",
          },
          _sum: { returnedAmount: true },
        }),
        prisma.invoice.groupBy({
          by: ["sourceTimestampId"],
          where: {
            ...baseWhere,
            sourceTimestampId: { in: shiftIds },
            status: { in: ["VOID", "CANCELLED"] },
          },
          _sum: { totalAmount: true },
        }),
        prisma.invoice.groupBy({
          by: ["sourceTimestampId"],
          where: {
            ...baseWhere,
            sourceTimestampId: { in: shiftIds },
            status: { in: ["PAID", "RETURNED"] },
          },
          _sum: {
            cashTendered: true,
            changeAmount: true,
            returnedAmount: true,
          },
        }),
      ]);
    }

    const refundsByShift = new Map(
      shiftRefundRows
        .filter((row) => row.sourceTimestampId)
        .map((row) => [row.sourceTimestampId!, toNumber(row._sum.returnedAmount)]),
    );
    const voidsByShift = new Map(
      shiftVoidRows
        .filter((row) => row.sourceTimestampId)
        .map((row) => [row.sourceTimestampId!, toNumber(row._sum.totalAmount)]),
    );
    const cashSalesByShift = new Map(
      shiftCashRows
        .filter((row) => row.sourceTimestampId)
        .map((row) => [
          row.sourceTimestampId!,
          Math.max(
            0,
            toNumber(row._sum.cashTendered) -
              toNumber(row._sum.changeAmount) -
              toNumber(row._sum.returnedAmount),
          ),
        ]),
    );
    const varianceInvestigations = recentlyClosedShifts.map((shift) => {
      const refunds = refundsByShift.get(shift.id) ?? 0;
      const voids = voidsByShift.get(shift.id) ?? 0;
      const cashSales =
        (cashSalesByShift.get(shift.id) ?? 0) +
        (debtCashByTimestamp.get(shift.id) ?? 0);
      const withdrawals = toNumber(shift.withdrawnDrawerAmount);
      const expectedCash = toNumber(shift.cashInDrawerAmount) + cashSales - withdrawals;
      const actualCash = toNumber(shift.cashOutDrawerAmount);
      const variance = actualCash - expectedCash;

      return {
        id: shift.id,
        terminalName: shift.posTerminal.posName ?? "Unnamed terminal",
        cashierName: shift.cashier.fullName ?? shift.cashier.email,
        openedAt: shift.timestampIn,
        closedAt: shift.timestampOut,
        expectedCash,
        actualCash,
        variance,
        refunds,
        voids,
        withdrawals,
        cashSales,
        severity: getVarianceSeverity(variance),
        explanation: explainVariance({
          variance,
          refunds,
          voids,
          withdrawals,
          offlineIssues: pendingSyncIssues + failedSyncIssues,
          pendingApprovals: pendingOperationalApprovals,
        }),
      };
    });
    const revenueGoalActualSales = calculateNetFromSums(revenueGoalSales._sum);
    const revenueGoalTarget = toNumber(revenueGoal?.targetAmount);
    const daysInGoalMonth = calendarMonthEnd.getDate();
    const daysElapsed = Math.max(
      1,
      Math.min(daysInGoalMonth, calendarMonthElapsedEnd.getDate()),
    );
    const daysRemaining = Math.max(0, daysInGoalMonth - daysElapsed);
    const dailyRunRate = revenueGoalActualSales / daysElapsed;
    const requiredDailyRunRate =
      daysRemaining > 0
        ? Math.max(0, revenueGoalTarget - revenueGoalActualSales) / daysRemaining
        : 0;
    const revenueGoalProgress = {
      month: calendarMonthStart,
      targetAmount: revenueGoalTarget,
      actualSales: revenueGoalActualSales,
      varianceAmount: revenueGoalActualSales - revenueGoalTarget,
      progressPercent:
        revenueGoalTarget > 0 ? (revenueGoalActualSales / revenueGoalTarget) * 100 : 0,
      dailyRunRate,
      requiredDailyRunRate,
      projectedMonthEndSales: dailyRunRate * daysInGoalMonth,
      daysElapsed,
      daysRemaining,
      notes: revenueGoal?.notes ?? null,
    };

    console.info("POSard dashboard aggregate metrics", {
      companyId,
      role: viewer.role,
      durationMs: Date.now() - dashboardStartedAt,
      trendBuckets: weekTrendRows.length,
      topProductBuckets: topProductRows.length,
      topAddOnBuckets: topAddOnRows.length,
      recentShiftCount: recentlyClosedShifts.length,
    });

    if (viewer.role === "manager") {
      return {
        role: viewer.role,
        viewerName: viewer.fullName ?? viewer.email,
        companyId,
        scopeLabel: company.name,
        heroTitle: "Store floor performance today",
        heroDescription: "Monitor live terminals, sales momentum, and stock pressure before it becomes an issue.",
        summary: [
          { label: "Net Sales", value: salesToday, tone: "success", hint: "Today across your company" },
          { label: "Transactions", value: paidTransactionCount, hint: "Completed receipts today" },
          { label: "Average Basket", value: paidTransactionCount > 0 ? salesToday / paidTransactionCount : 0, hint: "Net sales per paid invoice" },
          { label: "Open Sessions", value: todayOpenSessions, hint: "Cash drawers currently open" },
          { label: "Returns Today", value: returnsToday, tone: "warning", hint: "Returned amount today" },
          { label: "Voids Today", value: voidsToday, tone: "danger", hint: "Voided or cancelled totals" },
          { label: "Active Cashiers", value: activeCashiers, hint: "Enabled cashier accounts" },
          { label: "Debt Outstanding", value: toNumber(debtOutstanding._sum.remainingAmount), tone: "warning", hint: "Open receivables still pending collection" },
          { label: "Due Today", value: toNumber(debtDueToday._sum.remainingAmount), hint: "Debt balances due today" },
          { label: "Overdue Debt", value: toNumber(debtOverdue._sum.remainingAmount), tone: "danger", hint: "Receivables past due date" },
          { label: "Collected Today", value: toNumber(debtCollectedToday._sum.amount), tone: "success", hint: "Debt payments received today" },
          { label: "Target Variance", value: revenueGoalProgress.varianceAmount, tone: revenueGoalProgress.varianceAmount >= 0 ? "success" : "warning", hint: "Current month revenue goal variance" },
        ],
        terminals: terminals.map((terminal) => ({
          id: terminal.id,
          name: terminal.posName ?? "Unnamed terminal",
          secondaryLabel: terminal.timestamps.length > 0 ? "Open drawer" : "No open shift",
          sales: calculateNetFromSums(terminalSalesById.get(terminal.id)?._sum),
          transactions: terminalSalesById.get(terminal.id)?._count._all ?? 0,
          statusLabel: terminal.isActive ? "Live" : "Inactive",
        })),
        topProducts,
        topConfiguredProducts,
        topAddOns,
        lowStockProducts: thresholdLowStockProducts.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category.categoryName,
          quantity: toNumber(product.quantity),
          sales: toNumber(product.price),
        })),
        alerts: [
          ...(billingRestriction
            ? [{
                id: "billing-restricted",
                title: "Billing restriction is active",
                description:
                  "POS terminal access and cashier management are suspended until a terminal subscription is reactivated.",
                tone: "danger" as const,
              }]
            : []),
          ...(thresholdLowStockProducts.length > 0
            ? [{ id: "low-stock", title: "Low stock items detected", description: `${thresholdLowStockProducts.length} tracked product(s) are at or below their reorder point.`, tone: "warning" as const }]
            : []),
          ...(todayOpenSessions === 0
            ? [{ id: "no-open-session", title: "No open sessions", description: "No cashier drawer is currently open.", tone: "info" as const }]
            : []),
        ],
        operationalStatus,
        restockRecommendations,
        varianceInvestigations,
        revenueGoal: revenueGoalProgress,
        billingRestriction,
        ...commonData,
      };
    }

    const latestCashierShift = latestShift
      ? {
          terminalName: latestShift.posTerminal.posName ?? "Unnamed terminal",
          openedAt: latestShift.timestampIn,
          openingFund: toNumber(latestShift.cashInDrawerAmount),
          withdrawalAmount: toNumber(latestShift.withdrawnDrawerAmount),
          isOpen: !latestShift.timestampOut,
        }
      : {
          terminalName: null,
          openedAt: null,
          openingFund: 0,
          withdrawalAmount: 0,
          isOpen: false,
        };

    return {
      role: viewer.role,
      viewerName: viewer.fullName ?? viewer.email,
      companyId,
      scopeLabel: company.name,
      heroTitle: "Your shift, receipts, and pace",
      heroDescription: "Focus on your terminal, today's sales, and the receipts you've already handled.",
      summary: [
        { label: "My Sales Today", value: salesToday, tone: "success", hint: "Net paid sales on your receipts" },
        { label: "My Transactions", value: paidTransactionCount, hint: "Paid invoices handled today" },
        { label: "Average Basket", value: paidTransactionCount > 0 ? salesToday / paidTransactionCount : 0, hint: "Average paid receipt value" },
        { label: "Returns", value: returnsToday, tone: "warning", hint: "Returned amount on your invoices" },
        { label: "Debt Outstanding", value: toNumber(debtOutstanding._sum.remainingAmount), tone: "warning", hint: "Company receivables still unpaid" },
        { label: "Collected Today", value: toNumber(debtCollectedToday._sum.amount), tone: "success", hint: "Debt payments recorded today" },
      ],
      shift: latestCashierShift,
      alerts: [
        ...(billingRestriction
          ? [{
              id: "billing-restricted",
              title: "Billing restriction is active",
              description:
                "POS terminal access is suspended until a terminal subscription is reactivated.",
              tone: "danger" as const,
            }]
          : []),
        ...(!latestCashierShift.isOpen
          ? [{ id: "shift-closed", title: "No open shift", description: "Open a cashier session to start recording drawer activity.", tone: "info" as const }]
          : []),
      ],
      operationalStatus,
      restockRecommendations,
      revenueGoal: revenueGoalProgress,
      billingRestriction,
      topAddOns: topAddOns.slice(0, 3),
      ...commonData,
    };
  },
};
