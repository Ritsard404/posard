import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { buildRestockRecommendations } from "./inventory-restock.service";

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
    branchId: profile.branchId,
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
        ...(viewer.role === "manager"
          ? {
              terminal: {
                branchId:
                  viewer.branchId ?? "00000000-0000-0000-0000-000000000000",
              },
            }
          : {}),
        ...(status ? { syncStatus: status as never } : {}),
        ...(search
          ? {
              OR: [
                { localId: { contains: search, mode: "insensitive" } },
                { actionType: { contains: search, mode: "insensitive" } },
                { conflictCategory: { contains: search, mode: "insensitive" } },
                { message: { contains: search, mode: "insensitive" } },
                {
                  terminal: {
                    posName: { contains: search, mode: "insensitive" },
                  },
                },
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
        idempotencyKey: true,
        retryCount: true,
        nextRetryAt: true,
        terminal: {
          select: {
            posName: true,
            branch: { select: { name: true, code: true } },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return issues.map((issue) => ({
      ...issue,
      terminalName: issue.terminal?.posName ?? "Unassigned terminal",
      branchName: issue.terminal?.branch?.name ?? "Unassigned branch",
      branchCode: issue.terminal?.branch?.code ?? null,
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
                {
                  category: { name: { contains: search, mode: "insensitive" } },
                },
                {
                  terminal: {
                    posName: { contains: search, mode: "insensitive" },
                  },
                },
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
    const [
      movements,
      lowStock,
      negativeStock,
      noMovement,
      outOfStock,
      totalTracked,
      watchlist,
      soldItems,
    ] = await Promise.all([
      prisma.stockMovement.findMany({
        where: {
          ...companyWhere(viewer.companyId),
          ...(status ? { movementType: status as never } : {}),
          ...(search
            ? {
                OR: [
                  {
                    referenceNumber: { contains: search, mode: "insensitive" },
                  },
                  { sourceType: { contains: search, mode: "insensitive" } },
                  { notes: { contains: search, mode: "insensitive" } },
                  {
                    product: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  },
                  {
                    terminal: {
                      posName: { contains: search, mode: "insensitive" },
                    },
                  },
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
      prisma.product.count({
        where: {
          ...companyWhere(viewer.companyId),
          trackInventory: true,
          quantity: { lte: 0 },
          isDeleted: false,
        },
      }),
      prisma.product.count({
        where: {
          ...companyWhere(viewer.companyId),
          trackInventory: true,
          isDeleted: false,
        },
      }),
      prisma.product.findMany({
        where: {
          ...companyWhere(viewer.companyId),
          trackInventory: true,
          isDeleted: false,
          OR: [{ quantity: { lte: 10 } }, { stockMovements: { none: {} } }],
        },
        orderBy: [{ quantity: "asc" }, { name: "asc" }],
        take: 20,
        select: {
          id: true,
          name: true,
          quantity: true,
          cost: true,
          price: true,
          baseUnit: true,
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
          stockMovements: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              createdAt: true,
              movementType: true,
              referenceNumber: true,
            },
          },
        },
      }),
      prisma.item.groupBy({
        by: ["productId"],
        where: {
          invoice: {
            posTerminal: companyWhere(viewer.companyId),
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
            status: { in: ["PAID", "RETURNED"] },
          },
          status: { not: "VOID" },
        },
        _sum: { qty: true },
      }),
    ]);

    const soldQuantityByProduct = new Map(
      soldItems.map((item) => [item.productId, toNumber(item._sum.qty)]),
    );
    const restockRecommendations = buildRestockRecommendations(
      watchlist.map((product) => ({
        id: product.id,
        name: product.name,
        categoryName: product.category.categoryName,
        quantity: toNumber(product.quantity),
        baseUnit: product.baseUnit,
        cost: toNumber(product.cost),
        price: toNumber(product.price),
        soldQuantity: soldQuantityByProduct.get(product.id) ?? 0,
        supplierName: product.purchaseOrderItems[0]?.purchaseOrder.supplier.name ?? null,
      })),
    );

    return {
      stats: { lowStock, negativeStock, noMovement, outOfStock, totalTracked },
      watchlist: watchlist.map((product) => {
        const quantity = toNumber(product.quantity);
        const lastMovement = product.stockMovements[0] ?? null;
        return {
          id: product.id,
          name: product.name,
          categoryName: product.category.categoryName ?? "Uncategorized",
          quantity,
          baseUnit: product.baseUnit,
          stockValue: quantity * toNumber(product.cost),
          retailValue: quantity * toNumber(product.price),
          averageDailySales:
            restockRecommendations.find((item) => item.id === product.id)
              ?.averageDailySales ?? 0,
          remainingStockDays:
            restockRecommendations.find((item) => item.id === product.id)
              ?.remainingStockDays ?? null,
          recommendedReorderQuantity:
            restockRecommendations.find((item) => item.id === product.id)
              ?.recommendedReorderQuantity ?? 0,
          riskLevel:
            restockRecommendations.find((item) => item.id === product.id)
              ?.riskLevel ?? "low",
          supplierName:
            restockRecommendations.find((item) => item.id === product.id)
              ?.supplierName ?? null,
          health:
            quantity < 0
              ? "negative"
              : quantity === 0
                ? "out_of_stock"
                : quantity <= 10
                  ? "low_stock"
                  : "no_movement",
          lastMovementAt: lastMovement?.createdAt ?? null,
          lastMovementType: lastMovement?.movementType ?? null,
          lastReference: lastMovement?.referenceNumber ?? null,
        };
      }),
      restockRecommendations,
      movements: movements.map((movement) => ({
        ...movement,
        quantityDelta: toNumber(movement.quantityDelta),
        quantityBefore: movement.quantityBefore
          ? toNumber(movement.quantityBefore)
          : null,
        quantityAfter: movement.quantityAfter
          ? toNumber(movement.quantityAfter)
          : null,
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
                {
                  supplier: { name: { contains: search, mode: "insensitive" } },
                },
                {
                  items: {
                    some: {
                      product: {
                        name: { contains: search, mode: "insensitive" },
                      },
                    },
                  },
                },
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
                {
                  sourceTerminal: {
                    posName: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  destinationTerminal: {
                    posName: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  items: {
                    some: {
                      product: {
                        name: { contains: search, mode: "insensitive" },
                      },
                    },
                  },
                },
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
        loyaltyTransactions: {
          orderBy: { createdAt: "desc" },
          select: {
            pointsDelta: true,
            transactionType: true,
            reason: true,
            createdAt: true,
            invoice: {
              select: {
                invoiceNumber: true,
                totalAmount: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const invoices = await prisma.invoice.findMany({
      where: {
        posTerminal: companyWhere(viewer.companyId),
        status: { in: ["PAID", "RETURNED"] },
        customerName: { in: customers.map((customer) => customer.name) },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        totalAmount: true,
        returnedAmount: true,
        status: true,
        createdAt: true,
        posTerminal: { select: { posName: true } },
      },
    });

    const invoicesByCustomer = new Map<string, typeof invoices>();
    invoices.forEach((invoice) => {
      const list = invoicesByCustomer.get(invoice.customerName) ?? [];
      list.push(invoice);
      invoicesByCustomer.set(invoice.customerName, list);
    });

    return customers.map((customer) => {
      const customerInvoices = invoicesByCustomer.get(customer.name) ?? [];
      return {
        ...customer,
        outstandingDebt: customer.debts
          .filter(
            (debt) => debt.status === "UNPAID" || debt.status === "PARTIAL",
          )
          .reduce((sum, debt) => sum + toNumber(debt.remainingAmount), 0),
        loyaltyPoints: customer.loyaltyTransactions.reduce(
          (sum, transaction) => sum + transaction.pointsDelta,
          0,
        ),
        loyaltyEvents: customer.loyaltyTransactions
          .slice(0, 3)
          .map((transaction) => ({
            pointsDelta: transaction.pointsDelta,
            transactionType: transaction.transactionType,
            reason: transaction.reason,
            createdAt: transaction.createdAt,
            invoiceNumber: transaction.invoice?.invoiceNumber ?? null,
          })),
        purchaseCount: customerInvoices.length,
        totalSpent: customerInvoices.reduce(
          (sum, invoice) => sum + toNumber(invoice.totalAmount),
          0,
        ),
        returnedAmount: customerInvoices.reduce(
          (sum, invoice) => sum + toNumber(invoice.returnedAmount),
          0,
        ),
        lastPurchaseAt: customerInvoices[0]?.createdAt ?? null,
        recentPurchases: customerInvoices.slice(0, 3).map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: toNumber(invoice.totalAmount),
          returnedAmount: toNumber(invoice.returnedAmount),
          status: invoice.status,
          createdAt: invoice.createdAt,
          terminalName: invoice.posTerminal.posName ?? "Unnamed terminal",
        })),
      };
    });
  },

  async getPromotions(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const status = cleanFilter(filters.status);
    return prisma.promotion.findMany({
      where: {
        ...companyWhere(viewer.companyId),
        ...(status === "active" ? { isActive: true } : {}),
        ...(status === "paused" || status === "archived" || status === "draft"
          ? { isActive: false }
          : {}),
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
                {
                  terminal: {
                    posName: { contains: search, mode: "insensitive" },
                  },
                },
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
        item: {
          select: {
            qty: true,
            specialInstructions: true,
            product: { select: { name: true } },
          },
        },
        updatedBy: { select: { fullName: true, email: true } },
        readyAt: true,
        servedAt: true,
        createdAt: true,
      },
    });
  },
};
