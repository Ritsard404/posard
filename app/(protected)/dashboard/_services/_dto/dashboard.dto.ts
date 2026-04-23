import type { UserRole } from "@prisma/client";

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
  scopeLabel: string;
  heroTitle: string;
  heroDescription: string;
  summary: DashboardMetricDto[];
  trend: DashboardTrendPointDto[];
  paymentMix: DashboardPaymentMixDto[];
  recentActivities: DashboardActivityDto[];
  alerts: DashboardAlertDto[];
  terminals?: DashboardTerminalStatDto[];
  topProducts?: DashboardProductStatDto[];
  recentInvoices?: DashboardInvoiceListItemDto[];
  lowStockProducts?: DashboardProductStatDto[];
  companyLeaderboard?: DashboardTerminalStatDto[];
  shift?: DashboardShiftDto;
  adminWorkspaceStats?: DashboardAdminWorkspaceStatDto[];
  adminCompanies?: DashboardAdminCompanyHealthDto[];
  adminTerminalWatch?: DashboardAdminTerminalWatchDto[];
}
