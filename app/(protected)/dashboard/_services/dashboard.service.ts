import "server-only";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { DashboardDataDto, DashboardViewerDto } from "./_dto/dashboard.dto";

function toNumber(value: unknown) {
  return Number(value ?? 0);
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

function formatDayLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(value);
}

function buildTrend(
  invoices: Array<{ createdAt: Date; totalAmount: unknown; discountAmount: unknown; returnedAmount: unknown; status: string }>,
  days = 7,
) {
  const labels = Array.from({ length: days }, (_, index) => {
    const date = daysAgo(days - index - 1);
    return {
      key: date.toISOString().slice(0, 10),
      label: formatDayLabel(date),
      sales: 0,
      transactions: 0,
    };
  });

  const map = new Map(labels.map((item) => [item.key, item]));

  for (const invoice of invoices) {
    const key = startOfDay(invoice.createdAt).toISOString().slice(0, 10);
    const bucket = map.get(key);

    if (!bucket || invoice.status !== "PAID") {
      continue;
    }

    bucket.sales +=
      toNumber(invoice.totalAmount) -
      toNumber(invoice.discountAmount) -
      toNumber(invoice.returnedAmount);
    bucket.transactions += 1;
  }

  return labels;
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
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const weekStart = daysAgo(6);
    const monthStart = daysAgo(29);

    if (viewer.role === "admin") {
      const [
        companiesCount,
        activeManagers,
        activeCashiers,
        activeTerminals,
        pendingManagers,
        pendingRequests,
        todayInvoices,
        weekInvoices,
        monthInvoices,
        terminals,
        auditLogs,
      ] = await Promise.all([
        prisma.company.count(),
        prisma.profile.count({ where: { role: "manager", status: "active" } }),
        prisma.profile.count({ where: { role: "cashier", status: "active" } }),
        prisma.posTerminalInfo.count({ where: { isActive: true } }),
        prisma.profile.count({ where: { role: "manager", status: "pending" } }),
        prisma.terminalRequest.count({ where: { status: "pending" } }),
        prisma.invoice.findMany({
          where: { createdAt: { gte: todayStart, lte: todayEnd } },
          select: {
            totalAmount: true,
            discountAmount: true,
            returnedAmount: true,
            status: true,
            cashTendered: true,
            changeAmount: true,
            posTerminal: { select: { company: { select: { name: true } }, posName: true } },
            ePayments: { select: { amount: true, saleType: { select: { name: true } } } },
          },
        }),
        prisma.invoice.findMany({
          where: { createdAt: { gte: weekStart, lte: todayEnd } },
          select: {
            createdAt: true,
            totalAmount: true,
            discountAmount: true,
            returnedAmount: true,
            status: true,
          },
        }),
        prisma.invoice.findMany({
          where: { createdAt: { gte: monthStart, lte: todayEnd }, status: "PAID" },
          select: {
            totalAmount: true,
            discountAmount: true,
            returnedAmount: true,
            posTerminal: { select: { posName: true, company: { select: { name: true } } } },
          },
        }),
        prisma.posTerminalInfo.findMany({
          select: {
            id: true,
            posName: true,
            isActive: true,
            printerName: true,
            company: { select: { name: true } },
            timestamps: {
              where: { timestampOut: null },
              select: { id: true },
            },
            invoices: {
              where: { createdAt: { gte: todayStart, lte: todayEnd }, status: "PAID" },
              select: { totalAmount: true, discountAmount: true, returnedAmount: true },
            },
          },
          take: 6,
          orderBy: { posName: "asc" },
        }),
        prisma.auditLog.findMany({
          take: 6,
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

      const todaySales = todayInvoices.reduce((sum, invoice) => {
        if (invoice.status !== "PAID") return sum;
        return (
          sum +
          toNumber(invoice.totalAmount) -
          toNumber(invoice.discountAmount) -
          toNumber(invoice.returnedAmount)
        );
      }, 0);

      const companySalesMap = new Map<string, { sales: number; transactions: number }>();
      const paymentMap = new Map<string, number>();
      for (const invoice of monthInvoices) {
        const name = invoice.posTerminal.company.name;
        const current = companySalesMap.get(name) ?? { sales: 0, transactions: 0 };
        current.sales +=
          toNumber(invoice.totalAmount) -
          toNumber(invoice.discountAmount) -
          toNumber(invoice.returnedAmount);
        current.transactions += 1;
        companySalesMap.set(name, current);
      }

      for (const invoice of todayInvoices) {
        const cashAmount =
          Math.max(0, toNumber(invoice.cashTendered) - toNumber(invoice.changeAmount)) -
          toNumber(invoice.returnedAmount);

        if (cashAmount > 0) {
          paymentMap.set("Cash", (paymentMap.get("Cash") ?? 0) + cashAmount);
        }

        for (const payment of invoice.ePayments) {
          const key = payment.saleType.name ?? "Other";
          paymentMap.set(key, (paymentMap.get(key) ?? 0) + toNumber(payment.amount));
        }
      }

      return {
        role: viewer.role,
        viewerName: viewer.fullName ?? viewer.email,
        scopeLabel: "Workspace overview",
        heroTitle: "Multi-branch operations at a glance",
        heroDescription: "Track revenue, active teams, and live terminal health across the workspace.",
        summary: [
          { label: "Sales Today", value: todaySales, tone: "success", hint: "Net paid sales across all companies" },
          { label: "Transactions Today", value: todayInvoices.filter((item) => item.status === "PAID").length, hint: "Paid receipts captured today" },
          { label: "Active Terminals", value: activeTerminals, hint: "Currently marked live" },
          { label: "Cashiers Online", value: activeCashiers, hint: "Active cashier accounts" },
          { label: "Managers Active", value: activeManagers, hint: "Approved managers in workspace" },
          { label: "Companies", value: companiesCount, hint: "Registered businesses" },
        ],
        trend: buildTrend(weekInvoices),
        paymentMix: [...paymentMap.entries()]
          .map(([label, amount]) => ({ label, amount }))
          .sort((a, b) => b.amount - a.amount),
        companyLeaderboard: [...companySalesMap.entries()]
          .map(([name, item], index) => ({
            id: `${name}-${index}`,
            name,
            secondaryLabel: "Last 30 days",
            sales: item.sales,
            transactions: item.transactions,
            statusLabel: item.transactions > 0 ? "Selling" : "Idle",
          }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5),
        terminals: terminals.map((terminal) => ({
          id: terminal.id,
          name: terminal.posName,
          secondaryLabel: terminal.company.name,
          sales: terminal.invoices.reduce(
            (sum, invoice) =>
              sum +
              toNumber(invoice.totalAmount) -
              toNumber(invoice.discountAmount) -
              toNumber(invoice.returnedAmount),
            0,
          ),
          transactions: terminal.invoices.length,
          statusLabel: terminal.timestamps.length > 0 ? "Open session" : terminal.isActive ? "Ready" : "Offline",
        })),
        recentActivities: auditLogs.map((log) => ({
          id: log.id,
          title: log.actionType,
          description: `${log.actorProfile.fullName ?? log.actorProfile.email}${log.posTerminal ? ` • ${log.posTerminal.posName}` : ""}`,
          occurredAt: log.createdAt,
        })),
        alerts: [
          ...(pendingManagers > 0
            ? [{ id: "pending-managers", title: "Pending manager approvals", description: `${pendingManagers} manager account(s) still waiting for approval.`, tone: "warning" as const }]
            : []),
          ...(pendingRequests > 0
            ? [{ id: "pending-requests", title: "Terminal requests pending", description: `${pendingRequests} terminal request(s) need review.`, tone: "info" as const }]
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

    const baseWhere = { posTerminal: { companyId } } as const;

    const [
      todayInvoices,
      weekInvoices,
      monthItems,
      terminals,
      auditLogs,
      todayOpenSessions,
      lowStockProducts,
      recentInvoices,
      latestShift,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: { ...baseWhere, createdAt: { gte: todayStart, lte: todayEnd } },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          totalAmount: true,
          discountAmount: true,
          returnedAmount: true,
          status: true,
          createdAt: true,
          cashierId: true,
          posTerminal: { select: { posName: true } },
          ePayments: { select: { amount: true, saleType: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
        prisma.invoice.findMany({
          where: { ...baseWhere, createdAt: { gte: weekStart, lte: todayEnd } },
          select: {
            createdAt: true,
            totalAmount: true,
            discountAmount: true,
            returnedAmount: true,
            status: true,
            cashierId: true,
          },
        }),
      prisma.item.findMany({
        where: {
          invoice: { posTerminal: { companyId }, createdAt: { gte: monthStart, lte: todayEnd } },
          status: { not: "VOID" },
        },
        select: {
          id: true,
          qty: true,
          subTotal: true,
          invoice: { select: { status: true, returnedAmount: true, totalAmount: true } },
          product: {
            select: {
              name: true,
              category: { select: { categoryName: true } },
            },
          },
        },
      }),
      prisma.posTerminalInfo.findMany({
        where: { companyId },
        select: {
          id: true,
          posName: true,
          isActive: true,
          timestamps: { where: { timestampOut: null }, select: { id: true } },
          invoices: {
            where: { createdAt: { gte: todayStart, lte: todayEnd }, status: "PAID" },
            select: { totalAmount: true, discountAmount: true, returnedAmount: true },
          },
        },
        orderBy: { posName: "asc" },
      }),
      prisma.auditLog.findMany({
        where: { companyId },
        take: 6,
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
          quantity: { lte: 10 },
          isDeleted: false,
        },
        take: 5,
        orderBy: { quantity: "asc" },
        select: {
          id: true,
          name: true,
          quantity: true,
          price: true,
          category: { select: { categoryName: true } },
        },
      }),
      prisma.invoice.findMany({
        where:
          viewer.role === "cashier"
            ? { ...baseWhere, cashierId: viewer.profileId }
            : baseWhere,
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          totalAmount: true,
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
    ]);

    const todayScopedInvoices =
      viewer.role === "cashier"
        ? todayInvoices.filter((invoice) => invoice.cashierId === viewer.profileId)
        : todayInvoices;
    const weekScopedInvoices =
      viewer.role === "cashier"
        ? weekInvoices
        : weekInvoices;

    const salesToday = todayScopedInvoices.reduce((sum, invoice) => {
      if (invoice.status !== "PAID") return sum;
      return (
        sum +
        toNumber(invoice.totalAmount) -
        toNumber(invoice.discountAmount) -
        toNumber(invoice.returnedAmount)
      );
    }, 0);

    const returnsToday = todayScopedInvoices
      .filter((invoice) => invoice.status === "RETURNED")
      .reduce((sum, invoice) => sum + toNumber(invoice.returnedAmount), 0);
    const voidsToday = todayScopedInvoices
      .filter((invoice) => invoice.status === "VOID" || invoice.status === "CANCELLED")
      .reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0);

    const paymentMap = new Map<string, number>();
    for (const invoice of todayScopedInvoices) {
      for (const payment of invoice.ePayments) {
        const key = payment.saleType.name ?? "Other";
        paymentMap.set(key, (paymentMap.get(key) ?? 0) + toNumber(payment.amount));
      }
    }

    const productMap = new Map<string, { id: string; category: string | null; quantity: number; sales: number }>();
    for (const item of monthItems) {
      const current = productMap.get(item.product.name) ?? {
        id: item.id,
        category: item.product.category.categoryName,
        quantity: 0,
        sales: 0,
      };
      current.quantity += toNumber(item.qty);
      current.sales += toNumber(item.subTotal);
      productMap.set(item.product.name, current);
    }

    const commonData = {
      trend: buildTrend(
        viewer.role === "cashier"
          ? weekInvoices.filter((invoice) => invoice.cashierId === viewer.profileId)
          : weekScopedInvoices,
      ),
      paymentMix: [...paymentMap.entries()]
        .map(([label, amount]) => ({ label, amount }))
        .sort((a, b) => b.amount - a.amount),
      recentActivities: auditLogs.map((log) => ({
        id: log.id,
        title: log.actionType,
        description: `${log.actorProfile.fullName ?? log.actorProfile.email}${log.posTerminal ? ` • ${log.posTerminal.posName}` : ""}`,
        occurredAt: log.createdAt,
      })),
      recentInvoices: recentInvoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        terminalName: invoice.posTerminal.posName,
        amount: toNumber(invoice.totalAmount),
        status: invoice.status,
        createdAt: invoice.createdAt,
      })),
    };

    if (viewer.role === "manager") {
      const activeCashiers = await prisma.profile.count({
        where: { companyId, role: "cashier", status: "active" },
      });

      return {
        role: viewer.role,
        viewerName: viewer.fullName ?? viewer.email,
        scopeLabel: company.name,
        heroTitle: "Store floor performance today",
        heroDescription: "Monitor live terminals, sales momentum, and stock pressure before it becomes an issue.",
        summary: [
          { label: "Net Sales", value: salesToday, tone: "success", hint: "Today across your company" },
          { label: "Transactions", value: todayScopedInvoices.filter((item) => item.status === "PAID").length, hint: "Completed receipts today" },
          { label: "Average Basket", value: todayScopedInvoices.filter((item) => item.status === "PAID").length > 0 ? salesToday / todayScopedInvoices.filter((item) => item.status === "PAID").length : 0, hint: "Net sales per paid invoice" },
          { label: "Open Sessions", value: todayOpenSessions, hint: "Cash drawers currently open" },
          { label: "Returns Today", value: returnsToday, tone: "warning", hint: "Returned amount today" },
          { label: "Voids Today", value: voidsToday, tone: "danger", hint: "Voided or cancelled totals" },
          { label: "Active Cashiers", value: activeCashiers, hint: "Enabled cashier accounts" },
        ],
        terminals: terminals.map((terminal) => ({
          id: terminal.id,
          name: terminal.posName,
          secondaryLabel: terminal.timestamps.length > 0 ? "Open drawer" : "No open shift",
          sales: terminal.invoices.reduce(
            (sum, invoice) =>
              sum +
              toNumber(invoice.totalAmount) -
              toNumber(invoice.discountAmount) -
              toNumber(invoice.returnedAmount),
            0,
          ),
          transactions: terminal.invoices.length,
          statusLabel: terminal.isActive ? "Live" : "Inactive",
        })),
        topProducts: [...productMap.entries()]
          .map(([name, item]) => ({
            id: item.id,
            name,
            category: item.category,
            quantity: item.quantity,
            sales: item.sales,
          }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5),
        lowStockProducts: lowStockProducts.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category.categoryName,
          quantity: toNumber(product.quantity),
          sales: toNumber(product.price),
        })),
        alerts: [
          ...(lowStockProducts.length > 0
            ? [{ id: "low-stock", title: "Low stock items detected", description: `${lowStockProducts.length} tracked product(s) are at or below 10 units.`, tone: "warning" as const }]
            : []),
          ...(todayOpenSessions === 0
            ? [{ id: "no-open-session", title: "No open sessions", description: "No cashier drawer is currently open.", tone: "info" as const }]
            : []),
        ],
        ...commonData,
      };
    }

    const latestCashierShift = latestShift
      ? {
          terminalName: latestShift.posTerminal.posName,
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
      scopeLabel: company.name,
      heroTitle: "Your shift, receipts, and pace",
      heroDescription: "Focus on your terminal, today’s sales, and the receipts you’ve already handled.",
      summary: [
        { label: "My Sales Today", value: salesToday, tone: "success", hint: "Net paid sales on your receipts" },
        { label: "My Transactions", value: todayScopedInvoices.filter((item) => item.status === "PAID").length, hint: "Paid invoices handled today" },
        { label: "Average Basket", value: todayScopedInvoices.filter((item) => item.status === "PAID").length > 0 ? salesToday / todayScopedInvoices.filter((item) => item.status === "PAID").length : 0, hint: "Average paid receipt value" },
        { label: "Returns", value: returnsToday, tone: "warning", hint: "Returned amount on your invoices" },
      ],
      shift: latestCashierShift,
      alerts: latestCashierShift.isOpen
        ? []
        : [{ id: "shift-closed", title: "No open shift", description: "Open a cashier session to start recording drawer activity.", tone: "info" }],
      ...commonData,
    };
  },
};
