import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/lib/services/audit-log.service";
import type { BranchDTO, BranchManagerOptionDTO, BranchUpsertInput } from "./branch.dto";
import type { CompanyViewerDTO } from "./company-access.service";

const DEFAULT_BRANCH_SETTINGS = {
  receipt: { inheritCompany: true },
  inventory: { trackByBranch: true },
  printer: { inheritTerminalDefaults: true },
  cashDrawer: { openingCashRequired: true },
  sales: { allowOfflineQueue: true },
  offlineSync: { enabled: true },
} satisfies Prisma.JsonObject;

function mapBranch(branch: {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  managerId: string | null;
  manager: { fullName: string | null; email: string } | null;
  timezone: string | null;
  currency: string | null;
  taxMode: string | null;
  taxRate: Prisma.Decimal | null;
  receiptFooter: string | null;
  logoImageUrl: string | null;
  openingDate: Date | null;
  invoicePrefix: string | null;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    cashiers: number;
    posTerminals: number;
    invoices: number;
  };
  invoices: Array<{ totalAmount: Prisma.Decimal }>;
  timestamps: Array<{ id: string }>;
  customerDebts?: Array<{ id: string }>;
  products?: Array<{ id: string }>;
}): BranchDTO {
  const todaySales = branch.invoices.reduce(
    (total, invoice) => total + Number(invoice.totalAmount),
    0,
  );

  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    phone: branch.phone,
    email: branch.email,
    isActive: branch.isActive,
    managerId: branch.managerId,
    managerName: branch.manager?.fullName ?? branch.manager?.email ?? null,
    timezone: branch.timezone,
    currency: branch.currency,
    taxMode: branch.taxMode,
    taxRate: branch.taxRate ? Number(branch.taxRate) : null,
    receiptFooter: branch.receiptFooter,
    logoImageUrl: branch.logoImageUrl,
    openingDate: branch.openingDate,
    invoicePrefix: branch.invoicePrefix,
    companyId: branch.companyId,
    cashierCount: branch._count.cashiers,
    terminalCount: branch._count.posTerminals,
    invoiceCount: branch._count.invoices,
    activeCashierCount: branch._count.cashiers,
    activeTerminalCount: branch._count.posTerminals,
    todaySales,
    todayTransactions: branch.invoices.length,
    pendingDebtCount: branch.customerDebts?.length ?? 0,
    lowStockCount: branch.products?.length ?? 0,
    totalSales: todaySales,
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  };
}

function normalizeBranchPrefix(input: BranchUpsertInput) {
  const source = input.invoicePrefix || input.code || input.name;
  return source.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6) || "BR";
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

async function assertManagerBelongsToCompany(
  managerId: string | null | undefined,
  companyId: string,
) {
  if (!managerId) {
    return null;
  }

  const manager = await prisma.profile.findFirst({
    where: {
      id: managerId,
      companyId,
      role: "manager",
      status: { not: "disabled" },
    },
    select: { id: true },
  });

  if (!manager) {
    throw new Error("Branch manager not found");
  }

  return manager.id;
}

async function assertBranchBelongsToCompany(branchId: string, companyId: string) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId },
    select: { id: true },
  });

  if (!branch) {
    throw new Error("Branch not found");
  }
}

async function assertBranchNameAndCodeAvailable(
  companyId: string,
  input: BranchUpsertInput,
  excludeBranchId?: string,
) {
  const conflict = await prisma.branch.findFirst({
    where: {
      companyId,
      ...(excludeBranchId ? { id: { not: excludeBranchId } } : {}),
      OR: [
        { name: { equals: input.name, mode: "insensitive" as const } },
        ...(input.code
          ? [{ code: { equals: input.code, mode: "insensitive" as const } }]
          : []),
      ],
    },
    select: { id: true, name: true, code: true },
  });

  if (!conflict) {
    return;
  }

  if (conflict.name.toLowerCase() === input.name.toLowerCase()) {
    throw new Error("A branch with this name already exists");
  }

  throw new Error("A branch with this code already exists");
}

export const branchService = {
  async getManagerOptions(companyId: string): Promise<BranchManagerOptionDTO[]> {
    const managers = await prisma.profile.findMany({
      where: {
        companyId,
        role: "manager",
        status: { not: "disabled" },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
      orderBy: [{ fullName: "asc" }, { email: "asc" }],
    });

    return managers.map((manager) => ({
      id: manager.id,
      name: manager.fullName ?? manager.email,
      email: manager.email,
    }));
  },

  async getBranches(companyId: string): Promise<BranchDTO[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const branches = await prisma.branch.findMany({
      where: { companyId },
      include: {
        manager: { select: { fullName: true, email: true } },
        _count: {
          select: {
            cashiers: { where: { role: "cashier", status: { not: "disabled" } } },
            posTerminals: { where: { isActive: true } },
            invoices: true,
          },
        },
        invoices: {
          where: {
            status: "PAID",
            createdAt: { gte: startOfDay, lt: endOfDay },
          },
          select: { totalAmount: true },
        },
        timestamps: {
          where: { timestampOut: null },
          select: { id: true },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return branches.map(mapBranch);
  },

  async createBranch(
    viewer: CompanyViewerDTO,
    companyId: string,
    input: BranchUpsertInput,
  ): Promise<BranchDTO> {
    if (viewer.role !== "admin" && viewer.companyId !== companyId) {
      throw new Error("Forbidden");
    }

    await assertBranchNameAndCodeAvailable(companyId, input);
    const managerId = await assertManagerBelongsToCompany(input.managerId, companyId);

    const branch = await prisma.$transaction(async (tx) => {
      const company = await tx.company.findUnique({
        where: { id: companyId },
        select: {
          name: true,
          address: true,
          logoImageUrl: true,
          businessMode: true,
          enableFulfillmentTypes: true,
          enableTableService: true,
          enableDeliveryDetails: true,
          enableProductModifiers: true,
          enableKitchenTickets: true,
          _count: { select: { posTerminals: true } },
        },
      });

      if (!company) {
        throw new Error("Company not found");
      }

      const prefix = normalizeBranchPrefix(input);
      const created = await tx.branch.create({
        data: {
          companyId,
          name: input.name,
          code: input.code,
          address: input.address,
          phone: input.phone,
          email: input.email,
          managerId,
          timezone: input.timezone ?? "Asia/Manila",
          currency: input.currency ?? "PHP",
          taxMode: input.taxMode ?? "inherit",
          taxRate: input.taxRate,
          receiptFooter: input.receiptFooter,
          logoImageUrl: input.logoImageUrl ?? company.logoImageUrl,
          openingDate: input.openingDate ?? new Date(),
          invoicePrefix: prefix,
          settings: DEFAULT_BRANCH_SETTINGS,
          isActive: input.isActive ?? true,
        },
      });

      const terminal = await tx.posTerminalInfo.create({
        data: {
          companyId,
          branchId: created.id,
          posName: "Terminal 1",
          minNumber: `${prefix}-POS-001`,
          registeredName: company.name,
          operatedBy: input.name,
          address: input.address ?? company.address,
          dateIssued: new Date(),
          validUntil: addYears(new Date(), 1),
          isDefaultTerminal: company._count.posTerminals === 0,
          isActive: true,
          businessModeOverride: company.businessMode,
          enableFulfillmentTypes: company.enableFulfillmentTypes,
          enableTableService: company.enableTableService,
          enableDeliveryDetails: company.enableDeliveryDetails,
          enableProductModifiers: company.enableProductModifiers,
          enableKitchenTickets: company.enableKitchenTickets,
          enableRestaurantFeatures:
            company.enableTableService ||
            company.enableDeliveryDetails ||
            company.enableKitchenTickets,
        },
      });

      await auditLogService.create(tx, {
        companyId,
        actorProfileId: viewer.profileId,
        posTerminalId: terminal.id,
        actionType: "BRANCH_CREATED",
        referenceId: created.id,
        changes: `Created branch ${created.name} with default terminal ${terminal.posName ?? "Terminal 1"}.`,
      });

      await auditLogService.create(tx, {
        companyId,
        actorProfileId: viewer.profileId,
        posTerminalId: terminal.id,
        actionType: "BRANCH_DEFAULT_TERMINAL_CREATED",
        referenceId: terminal.id,
        changes: `Provisioned default POS terminal for branch ${created.name}.`,
      });

      return tx.branch.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          manager: { select: { fullName: true, email: true } },
          _count: {
            select: {
              cashiers: { where: { role: "cashier", status: { not: "disabled" } } },
              posTerminals: { where: { isActive: true } },
              invoices: true,
            },
          },
          invoices: {
            where: { status: "PAID" },
            select: { totalAmount: true },
          },
          timestamps: {
            where: { timestampOut: null },
            select: { id: true },
          },
        },
      });
    });

    return mapBranch(branch);
  },

  async updateBranch(
    viewer: CompanyViewerDTO,
    companyId: string,
    branchId: string,
    input: BranchUpsertInput,
  ): Promise<BranchDTO> {
    if (viewer.role !== "admin" && viewer.companyId !== companyId) {
      throw new Error("Forbidden");
    }

    await assertBranchBelongsToCompany(branchId, companyId);
    await assertBranchNameAndCodeAvailable(companyId, input, branchId);
    const managerId = await assertManagerBelongsToCompany(input.managerId, companyId);

    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        name: input.name,
        code: input.code,
        address: input.address,
        phone: input.phone,
        email: input.email,
        managerId,
        timezone: input.timezone ?? "Asia/Manila",
        currency: input.currency ?? "PHP",
        taxMode: input.taxMode ?? "inherit",
        taxRate: input.taxRate,
        receiptFooter: input.receiptFooter,
        logoImageUrl: input.logoImageUrl,
        openingDate: input.openingDate,
        invoicePrefix: normalizeBranchPrefix(input),
        isActive: input.isActive ?? true,
      },
      include: {
        manager: { select: { fullName: true, email: true } },
        _count: {
          select: {
            cashiers: { where: { role: "cashier", status: { not: "disabled" } } },
            posTerminals: { where: { isActive: true } },
            invoices: true,
          },
        },
        invoices: {
          where: { status: "PAID" },
          select: { totalAmount: true },
        },
        timestamps: {
          where: { timestampOut: null },
          select: { id: true },
        },
      },
    });

    return mapBranch(branch);
  },

  async disableBranch(
    viewer: CompanyViewerDTO,
    companyId: string,
    branchId: string,
  ): Promise<void> {
    if (viewer.role !== "admin" && viewer.companyId !== companyId) {
      throw new Error("Forbidden");
    }

    await assertBranchBelongsToCompany(branchId, companyId);

    await prisma.branch.update({
      where: { id: branchId },
      data: { isActive: false },
    });
  },
};
