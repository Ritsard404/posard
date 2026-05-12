import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/current-user";

async function requireCompany() {
  const profile = await getCurrentProfile();

  if (!profile?.companyId) {
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

export const remainingFeaturesService = {
  async getSyncIssues() {
    const viewer = await requireCompany();
    const issues = await prisma.offlineSyncIssue.findMany({
      where: { companyId: viewer.companyId },
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

  async getExpenses() {
    const viewer = await requireCompany();
    return prisma.expense.findMany({
      where: { companyId: viewer.companyId },
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
      },
    });
  },

  async getInventoryHealth() {
    const viewer = await requireCompany();
    const [movements, lowStock, negativeStock, noMovement] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { companyId: viewer.companyId },
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
          createdAt: true,
        },
      }),
      prisma.product.count({
        where: {
          companyId: viewer.companyId,
          trackInventory: true,
          quantity: { lte: 10, gt: 0 },
          isDeleted: false,
        },
      }),
      prisma.product.count({
        where: {
          companyId: viewer.companyId,
          trackInventory: true,
          quantity: { lt: 0 },
          isDeleted: false,
        },
      }),
      prisma.product.count({
        where: {
          companyId: viewer.companyId,
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

  async getSuppliers() {
    const viewer = await requireCompany();
    return prisma.supplier.findMany({
      where: { companyId: viewer.companyId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
        status: true,
        _count: { select: { purchaseOrders: true, receivingRecords: true } },
      },
    });
  },

  async getPurchaseOrders() {
    const viewer = await requireCompany();
    return prisma.purchaseOrder.findMany({
      where: { companyId: viewer.companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        poNumber: true,
        status: true,
        expectedAt: true,
        supplier: { select: { name: true } },
        items: { select: { quantity: true, unitCost: true } },
        createdAt: true,
      },
    });
  },

  async getTransfers() {
    const viewer = await requireCompany();
    return prisma.branchTransfer.findMany({
      where: { companyId: viewer.companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        transferNumber: true,
        status: true,
        sourceTerminal: { select: { posName: true } },
        destinationTerminal: { select: { posName: true } },
        requestedBy: { select: { fullName: true, email: true } },
        items: { select: { requestedQuantity: true } },
        createdAt: true,
      },
    });
  },

  async getCustomers() {
    const viewer = await requireCompany();
    const customers = await prisma.customer.findMany({
      where: { companyId: viewer.companyId },
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

  async getPromotions() {
    const viewer = await requireCompany();
    return prisma.promotion.findMany({
      where: { companyId: viewer.companyId },
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
        _count: { select: { redemptions: true } },
      },
    });
  },

  async getKitchenTickets() {
    const viewer = await requireCompany();
    return prisma.kitchenTicket.findMany({
      where: { companyId: viewer.companyId },
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
        createdAt: true,
      },
    });
  },
};
