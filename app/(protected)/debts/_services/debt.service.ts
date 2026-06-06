import "server-only";

import { DebtStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { auditLogService } from "@/lib/services/audit-log.service";
import type {
  CreateCustomerInput,
  CustomerListItemDto,
  DebtListFiltersInput,
  DebtListItemDto,
  DebtPaymentHistoryItemDto,
  DebtWorkspaceDto,
  RecordDebtPaymentInput,
} from "./debt.dto";

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

async function getViewer(): Promise<{
  id: string;
  companyId: string;
  role: "admin" | "manager" | "cashier";
  fullName: string | null;
}> {
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
    },
  });

  if (!profile?.companyId) {
    throw new Error("No company assigned to this account.");
  }

  return {
    id: profile.id,
    companyId: profile.companyId,
    role: profile.role,
    fullName: profile.fullName,
  };
}

function canCollectDebt(role: string, allowCashierDebtCollect: boolean) {
  return role === "admin" || role === "manager" || allowCashierDebtCollect;
}

export const debtService = {
  async listCustomers(): Promise<CustomerListItemDto[]> {
    const viewer = await getViewer();
    const companyId = viewer.companyId!;
    const rows = await prisma.customer.findMany({
      where: { companyId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      address: row.address,
      notes: row.notes,
      isActive: row.isActive,
    }));
  },

  async createCustomer(input: CreateCustomerInput): Promise<CustomerListItemDto> {
    const viewer = await getViewer();
    const companyId = viewer.companyId!;
    const customer = await prisma.customer.create({
      data: {
        companyId,
        name: input.name,
        phone: input.phone || null,
        address: input.address || null,
        notes: input.notes || null,
      },
    });

    await auditLogService.create(prisma, {
      companyId,
      actorProfileId: viewer.id,
      actionType: "DEBT_CUSTOMER_CREATED",
      referenceId: customer.id,
      changes: customer.name,
    });

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? null,
      address: customer.address ?? null,
      notes: customer.notes ?? null,
      isActive: customer.isActive,
    };
  },

  async getWorkspace(filters: DebtListFiltersInput): Promise<DebtWorkspaceDto> {
    const viewer = await getViewer();
    const companyId = viewer.companyId!;
    const where = {
      companyId,
      ...(filters.status !== "ALL" ? { status: filters.status as DebtStatus } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.terminalId ? { terminalId: filters.terminalId } : {}),
      ...(filters.query
        ? {
            OR: [
              { customer: { name: { contains: filters.query, mode: "insensitive" as const } } },
              { invoice: { customerName: { contains: filters.query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [items, customers, outstanding, dueToday, overdue, collectedToday, activeCustomers] =
      await Promise.all([
        prisma.customerDebt.findMany({
          where,
          include: {
            customer: { select: { id: true, name: true } },
            invoice: { select: { id: true, invoiceNumber: true } },
            terminal: { select: { posName: true } },
            createdBy: { select: { fullName: true } },
            payments: {
              orderBy: { createdAt: "desc" },
              take: 3,
              include: { receivedBy: { select: { fullName: true } } },
            },
          },
          orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        }),
        this.listCustomers(),
        prisma.customerDebt.aggregate({
          where: {
            companyId,
            status: { in: [DebtStatus.UNPAID, DebtStatus.PARTIAL] },
          },
          _sum: { remainingAmount: true },
        }),
        prisma.customerDebt.aggregate({
          where: {
            companyId,
            status: { in: [DebtStatus.UNPAID, DebtStatus.PARTIAL] },
            dueDate: { gte: start, lte: end },
          },
          _sum: { remainingAmount: true },
        }),
        prisma.customerDebt.aggregate({
          where: {
            companyId,
            status: { in: [DebtStatus.UNPAID, DebtStatus.PARTIAL] },
            dueDate: { lt: start },
          },
          _sum: { remainingAmount: true },
        }),
        prisma.customerDebtPayment.aggregate({
          where: {
            companyId,
            createdAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        prisma.customerDebt.groupBy({
          by: ["customerId"],
          where: {
            companyId,
            status: { in: [DebtStatus.UNPAID, DebtStatus.PARTIAL] },
          },
        }),
      ]);

    return {
      summary: {
        totalOutstanding: toNumber(outstanding._sum?.remainingAmount),
        dueToday: toNumber(dueToday._sum?.remainingAmount),
        overdue: toNumber(overdue._sum?.remainingAmount),
        collectedToday: toNumber(collectedToday._sum?.amount),
        activeCustomers: activeCustomers.length,
      },
      customers,
      items: items.map((item): DebtListItemDto => {
        const dueDate = new Date(item.dueDate);
        const isOpen = item.status === DebtStatus.UNPAID || item.status === DebtStatus.PARTIAL;
        const daysOverdue = isOpen
          ? Math.max(0, Math.floor((start.getTime() - dueDate.getTime()) / 86400000))
          : 0;
        const dueStatus =
          !isOpen
            ? "closed"
            : dueDate < start
              ? "overdue"
              : dueDate <= end
                ? "due_today"
                : "upcoming";

        return {
          id: item.id,
          invoiceId: item.invoiceId,
          invoiceNumber: item.invoice.invoiceNumber,
          customerId: item.customer.id,
          customerName: item.customer.name,
          terminalName: item.terminal?.posName ?? "Unnamed terminal",
          createdByName: item.createdBy.fullName ?? "Unknown",
          originalAmount: toNumber(item.originalAmount),
          paidAmount: toNumber(item.paidAmount),
          remainingAmount: toNumber(item.remainingAmount),
          status: item.status,
          dueDate: item.dueDate.toISOString(),
          createdAt: item.createdAt.toISOString(),
          paidAt: item.paidAt?.toISOString() ?? null,
          notes: item.notes ?? null,
          dueStatus,
          daysOverdue,
          paymentHistory: item.payments.map((payment) => ({
            id: payment.id,
            amount: toNumber(payment.amount),
            method: payment.method,
            referenceNo: payment.referenceNo ?? null,
            notes: payment.notes ?? null,
            receivedByName: payment.receivedBy.fullName ?? "Unknown",
            createdAt: payment.createdAt.toISOString(),
          })),
        };
      }),
    };
  },

  async getPaymentHistory(debtId: string): Promise<DebtPaymentHistoryItemDto[]> {
    const viewer = await getViewer();
    const companyId = viewer.companyId!;
    const rows = await prisma.customerDebtPayment.findMany({
      where: {
        debtId,
        companyId,
      },
      include: {
        receivedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      amount: toNumber(row.amount),
      method: row.method,
      referenceNo: row.referenceNo ?? null,
      notes: row.notes ?? null,
      receivedByName: row.receivedBy.fullName ?? "Unknown",
      createdAt: row.createdAt.toISOString(),
    }));
  },

  async recordPayment(input: RecordDebtPaymentInput) {
    const viewer = await getViewer();
    const companyId = viewer.companyId!;
    const debt = await prisma.customerDebt.findFirst({
      where: { id: input.debtId, companyId },
      include: {
        terminal: {
          select: {
            id: true,
            allowCashierDebtCollect: true,
          },
        },
      },
    });

    if (!debt) {
      throw new Error("Debt record not found.");
    }

    if (!canCollectDebt(viewer.role, debt.terminal?.allowCashierDebtCollect ?? false)) {
      throw new Error("You are not allowed to collect debt payments on this terminal.");
    }

    if (debt.status === DebtStatus.CANCELLED) {
      throw new Error("Cancelled debts cannot accept payments.");
    }

    if (debt.status === DebtStatus.PAID || toNumber(debt.remainingAmount) <= 0) {
      throw new Error("This debt is already fully paid.");
    }

    const amount = toNumber(input.amount);
    const remaining = toNumber(debt.remainingAmount);
    if (amount > remaining) {
      throw new Error("Payment amount cannot exceed the remaining balance.");
    }

    const nextPaid = toNumber(debt.paidAmount) + amount;
    const nextRemaining = Math.max(0, remaining - amount);
    const nextStatus =
      nextRemaining <= 0 ? DebtStatus.PAID : DebtStatus.PARTIAL;

    await prisma.$transaction(async (tx) => {
      await tx.customerDebtPayment.create({
        data: {
          debtId: debt.id,
          companyId,
          terminalId: debt.terminalId,
          timestampId: input.timestampId ?? null,
          amount,
          method: input.method,
          referenceNo: input.referenceNo || null,
          notes: input.notes || null,
          receivedById: viewer.id,
        },
      });

      await tx.customerDebt.update({
        where: { id: debt.id },
        data: {
          paidAmount: nextPaid,
          remainingAmount: nextRemaining,
          status: nextStatus,
          paidAt: nextRemaining <= 0 ? new Date() : null,
        },
      });

      await auditLogService.create(tx, {
        companyId,
        actorProfileId: viewer.id,
        posTerminalId: debt.terminalId ?? null,
        actionType: "DEBT_PAYMENT_RECORDED",
        referenceId: debt.id,
        changes: JSON.stringify({
          amount,
          method: input.method,
          referenceNo: input.referenceNo ?? null,
          timestampId: input.timestampId ?? null,
        }),
        amount,
      });
    });
  },
};
