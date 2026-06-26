import type { UserRole } from "@prisma/client";
import type { RestockRecommendationDto } from "../../../_services/inventory-restock.service";

export interface DashboardViewerDto {
  profileId: string;
  companyId: string | null;
  role: UserRole;
  fullName: string | null;
  email: string;
}

export interface DashboardMetricDto {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
  hint?: string;
}

export interface DashboardTrendPointDto {
  label: string;
  sales: number;
  transactions: number;
}

export interface DashboardPaymentMixDto {
  label: string;
  amount: number;
}

export interface DashboardFulfillmentMixDto {
  type: "WALK_IN" | "DINE_IN" | "TAKE_OUT" | "DELIVERY" | "PICKUP";
  label: string;
  count: number;
  sales: number;
  share: number;
}

export interface DashboardTerminalStatDto {
  id: string;
  name: string;
  secondaryLabel: string;
  sales: number;
  transactions: number;
  statusLabel: string;
}

export interface DashboardProductStatDto {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  sales: number;
}

export interface DashboardAddOnStatDto {
  id: string;
  name: string;
  parentProductName: string;
  quantity: number;
  revenue: number;
}

export interface DashboardActivityDto {
  id: string;
  title: string;
  description: string;
  occurredAt: Date;
}

export interface DashboardAlertDto {
  id: string;
  title: string;
  description: string;
  tone: "warning" | "danger" | "info";
}

export interface DashboardInvoiceListItemDto {
  id: string;
  invoiceNumber: number;
  customerName: string;
  terminalName: string;
  amount: number;
  status: string;
  createdAt: Date;
}

export interface DashboardShiftDto {
  terminalName: string | null;
  openedAt: Date | null;
  openingFund: number;
  withdrawalAmount: number;
  isOpen: boolean;
}

export interface DashboardOperationalSignalDto {
  label: string;
  value: number | string;
  status: "healthy" | "watch" | "critical" | "neutral";
  helper: string;
}

export interface DashboardOperationalStatusDto {
  title: string;
  updatedAt: Date;
  internetStatus: "unknown";
  offlineMode: "normal" | "attention";
  syncHealth: "healthy" | "attention";
  signals: DashboardOperationalSignalDto[];
}

export interface DashboardVarianceInvestigationDto {
  id: string;
  terminalName: string;
  cashierName: string;
  openedAt: Date | null;
  closedAt: Date | null;
  expectedCash: number;
  actualCash: number;
  variance: number;
  refunds: number;
  voids: number;
  withdrawals: number;
  cashSales: number;
  explanation: string;
  severity: "balanced" | "watch" | "critical";
}

export interface DashboardRevenueGoalDto {
  month: Date;
  targetAmount: number;
  actualSales: number;
  varianceAmount: number;
  progressPercent: number;
  dailyRunRate: number;
  requiredDailyRunRate: number;
  projectedMonthEndSales: number;
  daysElapsed: number;
  daysRemaining: number;
  notes: string | null;
}

export interface DashboardAdminWorkspaceStatDto {
  label: string;
  value: number;
  hint: string;
}

export interface DashboardAdminCompanyHealthDto {
  id: string;
  name: string;
  ownerName: string | null;
  terminalCount: number;
  activeTerminalCount: number;
  activeSubscriptionCount: number;
  pendingRequestCount: number;
  riskCount: number;
  lastActivityAt: Date | null;
}

export interface DashboardAdminTerminalWatchDto {
  id: string;
  name: string;
  companyName: string;
  terminalStateLabel: string;
  subscriptionStatusLabel: string;
  permitValidUntil: Date;
  subscriptionExpiresAt: Date | null;
  attentionLevel: "default" | "warning" | "danger";
  attentionReason: string;
}

export interface DashboardDataDto {
  role: UserRole;
  viewerName: string;
  companyId?: string | null;
  scopeLabel: string;
  heroTitle: string;
  heroDescription: string;
  billingRestriction?: {
    isRestricted: boolean;
    reason: string;
    affectedAreas: string[];
  } | null;
  summary: DashboardMetricDto[];
  trend: DashboardTrendPointDto[];
  paymentMix: DashboardPaymentMixDto[];
  fulfillmentMix: DashboardFulfillmentMixDto[];
  recentActivities: DashboardActivityDto[];
  alerts: DashboardAlertDto[];
  terminals?: DashboardTerminalStatDto[];
  topProducts?: DashboardProductStatDto[];
  topConfiguredProducts?: DashboardProductStatDto[];
  topAddOns?: DashboardAddOnStatDto[];
  recentInvoices?: DashboardInvoiceListItemDto[];
  lowStockProducts?: DashboardProductStatDto[];
  operationalStatus?: DashboardOperationalStatusDto;
  restockRecommendations?: RestockRecommendationDto[];
  varianceInvestigations?: DashboardVarianceInvestigationDto[];
  revenueGoal?: DashboardRevenueGoalDto;
  companyLeaderboard?: DashboardTerminalStatDto[];
  shift?: DashboardShiftDto;
  adminWorkspaceStats?: DashboardAdminWorkspaceStatDto[];
  adminCompanies?: DashboardAdminCompanyHealthDto[];
  adminTerminalWatch?: DashboardAdminTerminalWatchDto[];
}
