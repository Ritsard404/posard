import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/current-user";

export interface ManagementListFilters {
  search?: string;
  status?: string;
}

async function requireCompany() {
  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error("Authenticated profile is required.");
  }

  if (!profile.companyId && profile.role !== "admin") {
    throw new Error("Company context is required.");
  }

  return {
    profileId: profile.id,
    companyId: profile.companyId,
    role: profile.role,
  };
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function cleanFilter(value?: string) {
  return value?.trim() || undefined;
}

function companyWhere(companyId: string | null) {
  return companyId ? { companyId } : {};
}

export const remainingFeaturesService = {
  async getSyncIssues(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const status = cleanFilter(filters.status);
    const issues = await prisma.offlineSyncIssue.findMany({
      where: {
        ...companyWhere(viewer.companyId),
        ...(status ? { syncStatus: status as never } : {}),
        ...(search
          ? {
              OR: [
                { localId: { contains: search, mode: "insensitive" } },
                { actionType: { contains: search, mode: "insensitive" } },
                { conflictCategory: { contains: search, mode: "insensitive" } },
                { message: { contains: search, mode: "insensitive" } },
                { terminal: { posName: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        localId: true,
        actionType: true,
        syncStatus: true,
        conflictCategory: true,
        message: true,
        retryCount: true,
        nextRetryAt: true,
        terminal: { select: { posName: true } },
        createdAt: true,
      },
    });

    return issues.map((issue) => ({
      ...issue,
      terminalName: issue.terminal?.posName ?? "Unassigned terminal",
    }));
  },

  async getExpenses(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const status = cleanFilter(filters.status);

    return prisma.expense.findMany({
      where: {
        ...companyWhere(viewer.companyId),
        ...(status ? { status: status as never } : {}),
        ...(search
          ? {
              OR: [
                { referenceNumber: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                { category: { name: { contains: search, mode: "insensitive" } } },
                { terminal: { posName: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { expenseDate: "desc" },
      take: 100,
      select: {
        id: true,
        referenceNumber: true,
        expenseDate: true,
        amount: true,
        notes: true,
        status: true,
        category: { select: { name: true } },
        terminal: { select: { posName: true } },
        createdBy: { select: { fullName: true, email: true } },
        approvedBy: { select: { fullName: true, email: true } },
      },
    });
  },

  async getInventoryHealth(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const status = cleanFilter(filters.status);
    const [movements, lowStock, negativeStock, noMovement] = await Promise.all([
      prisma.stockMovement.findMany({
        where: {
          ...companyWhere(viewer.companyId),
          ...(status ? { movementType: status as never } : {}),
          ...(search
            ? {
                OR: [
                  { referenceNumber: { contains: search, mode: "insensitive" } },
                  { sourceType: { contains: search, mode: "insensitive" } },
                  { notes: { contains: search, mode: "insensitive" } },
                  { product: { name: { contains: search, mode: "insensitive" } } },
                  { terminal: { posName: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          movementType: true,
          quantityDelta: true,
          quantityBefore: true,
          quantityAfter: true,
          referenceNumber: true,
          sourceType: true,
          notes: true,
          product: { select: { name: true } },
          terminal: { select: { posName: true } },
          createdBy: { select: { fullName: true, email: true } },
          createdAt: true,
        },
      }),
      prisma.product.count({
        where: {
          ...companyWhere(viewer.companyId),
          trackInventory: true,
          quantity: { lte: 10, gt: 0 },
          isDeleted: false,
        },
      }),
      prisma.product.count({
        where: {
          ...companyWhere(viewer.companyId),
          trackInventory: true,
          quantity: { lt: 0 },
          isDeleted: false,
        },
      }),
      prisma.product.count({
        where: {
          ...companyWhere(viewer.companyId),
          trackInventory: true,
          isDeleted: false,
          stockMovements: { none: {} },
        },
      }),
    ]);

    return {
      stats: { lowStock, negativeStock, noMovement },
      movements: movements.map((movement) => ({
        ...movement,
        quantityDelta: toNumber(movement.quantityDelta),
        quantityBefore: movement.quantityBefore ? toNumber(movement.quantityBefore) : null,
        quantityAfter: movement.quantityAfter ? toNumber(movement.quantityAfter) : null,
      })),
    };
  },

  async getSuppliers(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const status = cleanFilter(filters.status);

    return prisma.supplier.findMany({
      where: {
        ...companyWhere(viewer.companyId),
        ...(status ? { status: status as never } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { contactName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        status: true,
        _count: { select: { purchaseOrders: true, receivingRecords: true } },
      },
    });
  },

  async getPurchaseOrders(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const status = cleanFilter(filters.status);

    return prisma.purchaseOrder.findMany({
      where: {
        ...companyWhere(viewer.companyId),
        ...(status ? { status: status as never } : {}),
        ...(search
          ? {
              OR: [
                { poNumber: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                { supplier: { name: { contains: search, mode: "insensitive" } } },
                { items: { some: { product: { name: { contains: search, mode: "insensitive" } } } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        poNumber: true,
        status: true,
        expectedAt: true,
        supplier: { select: { name: true } },
        createdBy: { select: { fullName: true, email: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            unitCost: true,
            receivedQuantity: true,
            product: { select: { name: true } },
          },
        },
        createdAt: true,
      },
    });
  },

  async getTransfers(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const status = cleanFilter(filters.status);

    return prisma.branchTransfer.findMany({
      where: {
        ...companyWhere(viewer.companyId),
        ...(status ? { status: status as never } : {}),
        ...(search
          ? {
              OR: [
                { transferNumber: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                { sourceTerminal: { posName: { contains: search, mode: "insensitive" } } },
                { destinationTerminal: { posName: { contains: search, mode: "insensitive" } } },
                { items: { some: { product: { name: { contains: search, mode: "insensitive" } } } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        transferNumber: true,
        status: true,
        sourceTerminal: { select: { posName: true } },
        destinationTerminal: { select: { posName: true } },
        requestedBy: { select: { fullName: true, email: true } },
        approvedBy: { select: { fullName: true, email: true } },
        receivedBy: { select: { fullName: true, email: true } },
        items: {
          select: {
            requestedQuantity: true,
            dispatchedQuantity: true,
            receivedQuantity: true,
            varianceQuantity: true,
            product: { select: { name: true } },
          },
        },
        createdAt: true,
      },
    });
  },

  async getCustomers() {
    const viewer = await requireCompany();
    const customers = await prisma.customer.findMany({
      where: companyWhere(viewer.companyId),
      orderBy: { name: "asc" },
      take: 100,
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
        debts: { select: { remainingAmount: true, status: true } },
        loyaltyTransactions: { select: { pointsDelta: true } },
      },
    });

    return customers.map((customer) => ({
      ...customer,
      outstandingDebt: customer.debts
        .filter((debt) => debt.status === "UNPAID" || debt.status === "PARTIAL")
        .reduce((sum, debt) => sum + toNumber(debt.remainingAmount), 0),
      loyaltyPoints: customer.loyaltyTransactions.reduce(
        (sum, transaction) => sum + transaction.pointsDelta,
        0,
      ),
    }));
  },

  async getPromotions(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const status = cleanFilter(filters.status);
    return prisma.promotion.findMany({
      where: {
        ...companyWhere(viewer.companyId),
        ...(status === "active" ? { isActive: true } : {}),
        ...(status === "paused" || status === "archived" || status === "draft" ? { isActive: false } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        name: true,
        promotionType: true,
        value: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        stackable: true,
        exclusive: true,
        ruleJson: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { redemptions: true } },
      },
    });
  },

  async getKitchenTickets(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const status = cleanFilter(filters.status);
    return prisma.kitchenTicket.findMany({
      where: {
        ...companyWhere(viewer.companyId),
        ...(status ? { status: status as never } : {}),
        ...(search
          ? {
              OR: [
                { ticketNumber: { contains: search, mode: "insensitive" } },
                { station: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                { terminal: { posName: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        station: true,
        notes: true,
        terminal: { select: { posName: true } },
        invoice: { select: { invoiceNumber: true, fulfillmentType: true } },
        updatedBy: { select: { fullName: true, email: true } },
        readyAt: true,
        servedAt: true,
        createdAt: true,
      },
    });
  },
};
