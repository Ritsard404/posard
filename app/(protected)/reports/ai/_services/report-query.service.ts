import "server-only";

import { prisma } from "@/lib/prisma";
import { reportAccessService } from "@/app/(protected)/report/_services/report-access.service";
import { reportService } from "@/app/(protected)/report/_services/report.service";
import { formatReportDate } from "@/lib/report-date-format";
import type {
  AiReportCompanyOptionDto,
  AiReportFactsDto,
} from "./_dto/ai-report.dto";
import type { AiReportQuestionInput } from "./_validators/ai-report.schema";

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function resolveRange(preset: AiReportQuestionInput["preset"]) {
  const today = new Date();

  if (preset === "yesterday") {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    return { from: startOfDay(date), to: endOfDay(date) };
  }

  if (preset === "7d" || preset === "30d") {
    const from = startOfDay(today);
    from.setDate(from.getDate() - (preset === "7d" ? 6 : 29));
    return { from, to: endOfDay(today) };
  }

  if (preset === "thisMonth") {
    return {
      from: startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: endOfDay(today),
    };
  }

  return { from: startOfDay(today), to: endOfDay(today) };
}

export const aiReportQueryService = {
  async loadPageContext(): Promise<{
    viewerRole: "admin" | "manager" | "cashier";
    defaultCompanyId: string | null;
    companies: AiReportCompanyOptionDto[];
  }> {
    const viewer = await reportAccessService.getViewer();

    if (viewer.role !== "admin") {
      return {
        viewerRole: viewer.role,
        defaultCompanyId: viewer.companyId,
        companies: [],
      };
    }

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        posTerminals: {
          select: { isActive: true },
        },
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    return {
      viewerRole: viewer.role,
      defaultCompanyId: companies[0]?.id ?? null,
      companies: companies.map((company) => ({
        id: company.id,
        name: company.name,
        terminalCount: company.posTerminals.length,
        activeTerminalCount: company.posTerminals.filter((terminal) => terminal.isActive)
          .length,
      })),
    };
  },

  async resolveFacts(input: AiReportQuestionInput): Promise<AiReportFactsDto> {
    const viewer = await reportAccessService.getViewer();
    const companyId = viewer.role === "admin" ? input.companyId : viewer.companyId;

    if (!companyId) {
      throw new Error(
        viewer.role === "admin"
          ? "Select a company before asking the admin AI report assistant."
          : "Reports are unavailable until the profile is assigned to a company.",
      );
    }

    const range = resolveRange(input.preset);
    const overview = await reportService.getOverview(viewer, {
      companyId,
      terminalId: input.terminalId,
      from: range.from,
      to: range.to,
    });

    return {
      scope: {
        profileId: viewer.profileId,
        role: viewer.role,
        companyId,
        terminalId: input.terminalId ?? null,
      },
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        label: `${formatReportDate(range.from)} to ${formatReportDate(range.to)}`,
      },
      summary: {
        totalSales: overview.totalSales,
        totalTransactions: overview.totalTransactions,
        totalDiscounts: overview.totalDiscounts,
        totalCashSales: overview.totalCashSales,
        totalEPaymentSales: overview.totalEPaymentSales,
        averageTransactionValue: overview.averageTransactionValue,
        salesChangePercent: overview.salesChangePercent,
        salesComparisonLabel: overview.salesComparisonLabel,
      },
      topProducts: overview.topProducts.slice(0, 5).map((item) => ({
        name: item.name,
        quantitySold: item.quantitySold,
        revenue: item.revenue,
      })),
      paymentMethods: overview.paymentMethodBreakdown.map((item) => ({
        name: item.name,
        count: item.count,
        amount: item.amount,
      })),
    };
  },
};
