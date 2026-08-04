import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { buildRestockRecommendations } from "./inventory-restock.service";

export interface ManagementListFilters {
  search?: string;
  status?: string;
}

export interface CustomerListFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

const CUSTOMER_PAGE_SIZE = 25;
const CUSTOMER_MAX_PAGE_SIZE = 100;

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

function boundedPositiveInteger(value: number | undefined, fallback: number, max: number) {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(value), 1), max);
}

export const remainingFeaturesService = {
  async getSyncIssues(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const status = cleanFilter(filters.status);
    const issues = await prisma.offlineSyncIssue.findMany({
      where: {
        ...companyWhere(viewer.companyId),
        ...(viewer.role === "manager" && viewer.branchId
          ? {
              terminal: {
                branchId: viewer.branchId,
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

  async getNonSalesIncomes(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);

    return prisma.nonSalesIncome.findMany({
      where: {
        ...companyWhere(viewer.companyId),
        ...(search
          ? {
              OR: [
                { referenceNumber: { contains: search, mode: "insensitive" } },
                { source: { contains: search, mode: "insensitive" } },
                { externalReference: { contains: search, mode: "insensitive" } },
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
      orderBy: { incomeDate: "desc" },
      take: 100,
      select: {
        id: true,
        referenceNumber: true,
        incomeDate: true,
        source: true,
        amount: true,
        externalReference: true,
        notes: true,
        terminal: { select: { posName: true } },
        createdBy: { select: { fullName: true, email: true } },
      },
    });
  },

  async getInventoryHealth(filters: ManagementListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const status = cleanFilter(filters.status);
    const [
      movements,
      lowStockCandidates,
      negativeStock,
      noMovement,
      outOfStock,
      totalTracked,
      watchlist,
      stockLots,
      stockCountSessions,
      dispositionMovements,
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
      prisma.product.findMany({
        where: {
          ...companyWhere(viewer.companyId),
          trackInventory: true,
          quantity: { gt: 0 },
          isDeleted: false,
        },
        select: { quantity: true, reorderPoint: true },
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
          OR: [
            { quantity: { lte: 10 } },
            { reorderPoint: { not: null } },
            { stockMovements: { none: {} } },
          ],
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
      prisma.stockLot.findMany({
        where: {
          ...companyWhere(viewer.companyId),
          quantityOnHand: { gt: 0 },
          ...(search
            ? {
                OR: [
                  { batchNumber: { contains: search, mode: "insensitive" } },
                  { shelfLocation: { contains: search, mode: "insensitive" } },
                  {
                    product: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  },
                  {
                    supplier: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ expiryDate: "asc" }, { product: { name: "asc" } }],
        take: 100,
        select: {
          id: true,
          batchNumber: true,
          expiryDate: true,
          quantityOnHand: true,
          unitCost: true,
          shelfLocation: true,
          status: true,
          product: {
            select: {
              name: true,
              baseUnit: true,
              category: { select: { categoryName: true } },
            },
          },
          supplier: { select: { name: true } },
        },
      }),
      prisma.stockCountSession.findMany({
        where: {
          ...companyWhere(viewer.companyId),
          ...(status
            ? { status: status as never }
            : { status: { in: ["draft", "submitted", "rejected"] } }),
          ...(search
            ? {
                OR: [
                  { countNumber: { contains: search, mode: "insensitive" } },
                  { notes: { contains: search, mode: "insensitive" } },
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
        take: 12,
        select: {
          id: true,
          countNumber: true,
          status: true,
          notes: true,
          startedAt: true,
          submittedAt: true,
          approvedAt: true,
          createdBy: { select: { fullName: true, email: true } },
          assignedTo: { select: { fullName: true, email: true } },
          items: {
            take: 5,
            select: {
              id: true,
              expectedQuantity: true,
              countedQuantity: true,
              varianceQuantity: true,
              notes: true,
              product: {
                select: {
                  name: true,
                  baseUnit: true,
                  category: { select: { categoryName: true } },
                },
              },
              stockLot: {
                select: {
                  batchNumber: true,
                  expiryDate: true,
                },
              },
            },
          },
        },
      }),
      prisma.stockMovement.findMany({
        where: {
          ...companyWhere(viewer.companyId),
          movementType: "waste",
          sourceType: {
            in: ["stock_damaged", "stock_lost", "stock_expired", "stock_disposed"],
          },
          ...(search
            ? {
                OR: [
                  { referenceNumber: { contains: search, mode: "insensitive" } },
                  { notes: { contains: search, mode: "insensitive" } },
                  {
                    product: {
                      name: { contains: search, mode: "insensitive" },
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
          quantityDelta: true,
          unitCost: true,
          sourceType: true,
          referenceNumber: true,
          notes: true,
          createdAt: true,
          product: {
            select: {
              name: true,
              baseUnit: true,
              price: true,
              category: { select: { categoryName: true } },
            },
          },
          stockLot: {
            select: {
              batchNumber: true,
              expiryDate: true,
            },
          },
          createdBy: { select: { fullName: true, email: true } },
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

    const lowStock = lowStockCandidates.filter((product) => {
      const quantity = toNumber(product.quantity);
      return quantity > 0 && quantity <= toNumber(product.reorderPoint ?? 10);
    }).length;

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
        reorderPoint: product.reorderPoint === null ? null : toNumber(product.reorderPoint),
        supplierName: product.preferredSupplier?.name ?? product.purchaseOrderItems[0]?.purchaseOrder.supplier.name ?? null,
      })),
    );
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;
    const expiryLots = stockLots
      .map((lot) => {
        const quantity = toNumber(lot.quantityOnHand);
        const daysUntilExpiry = lot.expiryDate
          ? Math.floor((lot.expiryDate.getTime() - todayStart.getTime()) / dayMs)
          : null;

        return {
          id: lot.id,
          productName: lot.product.name,
          categoryName: lot.product.category?.categoryName ?? "Uncategorized",
          baseUnit: lot.product.baseUnit,
          batchNumber: lot.batchNumber,
          expiryDate: lot.expiryDate,
          daysUntilExpiry,
          quantity,
          costValue: quantity * toNumber(lot.unitCost),
          shelfLocation: lot.shelfLocation,
          supplierName: lot.supplier?.name ?? null,
          status: lot.status,
          bucket:
            daysUntilExpiry === null
              ? "no_expiry"
              : daysUntilExpiry < 0 || lot.status === "expired"
                ? "expired"
                : daysUntilExpiry <= 30
                  ? "0_30"
                  : daysUntilExpiry <= 60
                    ? "31_60"
                    : daysUntilExpiry <= 90
                      ? "61_90"
                      : "later",
        };
      })
      .sort((a, b) => {
        const aDays = a.daysUntilExpiry ?? Number.POSITIVE_INFINITY;
        const bDays = b.daysUntilExpiry ?? Number.POSITIVE_INFINITY;
        if (aDays !== bDays) return aDays - bDays;
        return a.productName.localeCompare(b.productName);
      });
    const bucketOrder = [
      { key: "expired", label: "Expired" },
      { key: "0_30", label: "0-30 days" },
      { key: "31_60", label: "31-60 days" },
      { key: "61_90", label: "61-90 days" },
      { key: "no_expiry", label: "No expiry date" },
    ];
    const expiryBuckets = bucketOrder.map((bucket) => {
      const matches = expiryLots.filter((lot) => lot.bucket === bucket.key);
      return {
        key: bucket.key,
        label: bucket.label,
        count: matches.length,
        quantity: matches.reduce((sum, lot) => sum + lot.quantity, 0),
        costValue: matches.reduce((sum, lot) => sum + lot.costValue, 0),
      };
    });
    const nearExpiryLots = expiryLots
      .filter((lot) => lot.bucket !== "later" && lot.bucket !== "no_expiry")
      .slice(0, 12);
    const stockCountItems = stockCountSessions.map((session) => {
      const totalVariance = session.items.reduce(
        (sum, item) => sum + toNumber(item.varianceQuantity),
        0,
      );

      return {
        id: session.id,
        countNumber: session.countNumber,
        status: session.status,
        notes: session.notes,
        startedAt: session.startedAt,
        submittedAt: session.submittedAt,
        approvedAt: session.approvedAt,
        createdBy:
          session.createdBy.fullName ?? session.createdBy.email ?? "Unknown",
        assignedTo:
          session.assignedTo?.fullName ??
          session.assignedTo?.email ??
          "Unassigned",
        totalVariance,
        items: session.items.map((item) => ({
          id: item.id,
          productName: item.product.name,
          categoryName: item.product.category?.categoryName ?? "Uncategorized",
          baseUnit: item.product.baseUnit,
          batchNumber: item.stockLot?.batchNumber ?? null,
          expiryDate: item.stockLot?.expiryDate ?? null,
          expectedQuantity: toNumber(item.expectedQuantity),
          countedQuantity:
            item.countedQuantity === null
              ? null
              : toNumber(item.countedQuantity),
          varianceQuantity:
            item.varianceQuantity === null
              ? null
              : toNumber(item.varianceQuantity),
          notes: item.notes,
        })),
      };
    });
    const dispositionEvents = dispositionMovements.map((movement) => {
      const quantity = Math.abs(toNumber(movement.quantityDelta));
      const unitCost = movement.unitCost === null
        ? 0
        : toNumber(movement.unitCost);
      const reason = (movement.sourceType ?? "stock_disposed").replace(
        "stock_",
        "",
      );

      return {
        id: movement.id,
        reason,
        referenceNumber: movement.referenceNumber,
        productName: movement.product.name,
        categoryName: movement.product.category?.categoryName ?? "Uncategorized",
        baseUnit: movement.product.baseUnit,
        batchNumber: movement.stockLot?.batchNumber ?? null,
        expiryDate: movement.stockLot?.expiryDate ?? null,
        quantity,
        costImpact: quantity * unitCost,
        retailImpact: quantity * toNumber(movement.product.price),
        notes: movement.notes,
        createdAt: movement.createdAt,
        actor:
          movement.createdBy?.fullName ?? movement.createdBy?.email ?? "Unknown",
      };
    });
    const dispositionBuckets = ["damaged", "lost", "expired", "disposed"].map(
      (reason) => {
        const matches = dispositionEvents.filter((event) => event.reason === reason);
        return {
          reason,
          count: matches.length,
          quantity: matches.reduce((sum, event) => sum + event.quantity, 0),
          costImpact: matches.reduce((sum, event) => sum + event.costImpact, 0),
          retailImpact: matches.reduce(
            (sum, event) => sum + event.retailImpact,
            0,
          ),
        };
      },
    );

    return {
      stats: {
        lowStock,
        negativeStock,
        noMovement,
        outOfStock,
        totalTracked,
        expiredLots:
          expiryBuckets.find((bucket) => bucket.key === "expired")?.count ?? 0,
        nearExpiryLots:
          expiryBuckets.find((bucket) => bucket.key === "0_30")?.count ?? 0,
        pendingStockCounts: stockCountItems.filter(
          (session) => session.status === "submitted",
        ).length,
        lossEvents: dispositionEvents.length,
      },
      expiryBuckets,
      nearExpiryLots,
      stockCountSessions: stockCountItems,
      dispositionBuckets,
      dispositionEvents: dispositionEvents.slice(0, 12),
      watchlist: watchlist.map((product) => {
        const quantity = toNumber(product.quantity);
        const reorderPoint = product.reorderPoint === null ? null : toNumber(product.reorderPoint);
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
                : quantity <= (reorderPoint ?? 10)
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

  async getCustomers(filters: CustomerListFilters = {}) {
    const viewer = await requireCompany();
    const search = cleanFilter(filters.search);
    const pageSize = boundedPositiveInteger(
      filters.pageSize,
      CUSTOMER_PAGE_SIZE,
      CUSTOMER_MAX_PAGE_SIZE,
    );
    const requestedPage = boundedPositiveInteger(filters.page, 1, 10_000);
    const customerWhere: Prisma.CustomerWhereInput = {
      ...companyWhere(viewer.companyId),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
              { notes: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const totalCustomers = await prisma.customer.count({ where: customerWhere });
    const totalPages = Math.max(1, Math.ceil(totalCustomers / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const [customers, activeCustomers, debtSummary, loyaltySummary, purchaseSummary] =
      await Promise.all([
        prisma.customer.findMany({
          where: customerWhere,
          orderBy: { name: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            notes: true,
            isActive: true,
          },
        }),
        prisma.customer.count({
          where: { ...customerWhere, isActive: true },
        }),
        prisma.customerDebt.aggregate({
          where: {
            ...(viewer.companyId ? { companyId: viewer.companyId } : {}),
            customer: customerWhere,
            status: { in: ["UNPAID", "PARTIAL"] },
          },
          _sum: { remainingAmount: true },
        }),
        prisma.loyaltyTransaction.aggregate({
          where: {
            ...(viewer.companyId ? { companyId: viewer.companyId } : {}),
            customer: customerWhere,
          },
          _sum: { pointsDelta: true },
        }),
        prisma.invoice.aggregate({
          where: {
            customer: { is: customerWhere },
            posTerminal: companyWhere(viewer.companyId),
            status: { in: ["PAID", "RETURNED"] },
          },
          _sum: { totalAmount: true },
        }),
      ]);
    const customerIds = customers.map((customer) => customer.id);
    const customerAggregateResults = customerIds.length
      ? await Promise.all([
          prisma.customerDebt.groupBy({
            by: ["customerId"],
            where: {
              companyId: viewer.companyId ?? undefined,
              customerId: { in: customerIds },
              status: { in: ["UNPAID", "PARTIAL"] },
            },
            _sum: { remainingAmount: true },
          }),
          prisma.loyaltyTransaction.groupBy({
            by: ["customerId"],
            where: {
              companyId: viewer.companyId ?? undefined,
              customerId: { in: customerIds },
            },
            _sum: { pointsDelta: true },
          }),
          prisma.loyaltyTransaction.findMany({
            where: {
              companyId: viewer.companyId ?? undefined,
              customerId: { in: customerIds },
            },
            orderBy: { createdAt: "desc" },
            take: Math.min(customerIds.length * 12, 300),
            select: {
              customerId: true,
              pointsDelta: true,
              transactionType: true,
              reason: true,
              createdAt: true,
              invoice: { select: { invoiceNumber: true } },
            },
          }),
          prisma.invoice.groupBy({
            by: ["customerId"],
            where: {
              customerId: { in: customerIds },
              posTerminal: companyWhere(viewer.companyId),
              status: { in: ["PAID", "RETURNED"] },
            },
            _count: { _all: true },
            _sum: {
              totalAmount: true,
              returnedAmount: true,
            },
            _max: { createdAt: true },
          }),
          prisma.invoice.findMany({
            where: {
              customerId: { in: customerIds },
              posTerminal: companyWhere(viewer.companyId),
              status: { in: ["PAID", "RETURNED"] },
            },
            orderBy: { createdAt: "desc" },
            take: Math.min(customerIds.length * 12, 300),
            select: {
              id: true,
              customerId: true,
              invoiceNumber: true,
              totalAmount: true,
              returnedAmount: true,
              status: true,
              createdAt: true,
              posTerminal: { select: { posName: true } },
            },
          }),
        ])
      : null;
    const debtSummaries = customerAggregateResults?.[0] ?? [];
    const loyaltySummaries = customerAggregateResults?.[1] ?? [];
    const recentLoyaltyTransactions = customerAggregateResults?.[2] ?? [];
    const purchaseSummaries = customerAggregateResults?.[3] ?? [];
    const recentInvoices = customerAggregateResults?.[4] ?? [];

    const debtByCustomer = new Map(
      debtSummaries.map((item) => [item.customerId, toNumber(item._sum.remainingAmount)]),
    );
    const loyaltyByCustomer = new Map(
      loyaltySummaries.map((item) => [item.customerId, item._sum.pointsDelta ?? 0]),
    );
    const purchaseSummaryByCustomer = new Map(
      purchaseSummaries
        .filter((item) => item.customerId)
        .map((item) => [
          item.customerId!,
          {
            purchaseCount: item._count._all,
            totalSpent: toNumber(item._sum.totalAmount),
            returnedAmount: toNumber(item._sum.returnedAmount),
            lastPurchaseAt: item._max.createdAt,
          },
        ]),
    );
    const loyaltyEventsByCustomer = new Map<string, typeof recentLoyaltyTransactions>();
    for (const transaction of recentLoyaltyTransactions) {
      const list = loyaltyEventsByCustomer.get(transaction.customerId) ?? [];
      if (list.length < 3) {
        list.push(transaction);
        loyaltyEventsByCustomer.set(transaction.customerId, list);
      }
    }
    const invoicesByCustomer = new Map<string, typeof recentInvoices>();
    for (const invoice of recentInvoices) {
      if (!invoice.customerId) continue;
      const list = invoicesByCustomer.get(invoice.customerId) ?? [];
      if (list.length < 3) {
        list.push(invoice);
        invoicesByCustomer.set(invoice.customerId, list);
      }
    }

    const items = customers.map((customer) => {
      const customerInvoices = invoicesByCustomer.get(customer.id) ?? [];
      const purchaseSummary = purchaseSummaryByCustomer.get(customer.id);
      return {
        ...customer,
        outstandingDebt: debtByCustomer.get(customer.id) ?? 0,
        loyaltyPoints: loyaltyByCustomer.get(customer.id) ?? 0,
        loyaltyEvents: (loyaltyEventsByCustomer.get(customer.id) ?? [])
          .map((transaction) => ({
            pointsDelta: transaction.pointsDelta,
            transactionType: transaction.transactionType,
            reason: transaction.reason,
            createdAt: transaction.createdAt,
            invoiceNumber: transaction.invoice?.invoiceNumber ?? null,
          })),
        purchaseCount: purchaseSummary?.purchaseCount ?? 0,
        totalSpent: purchaseSummary?.totalSpent ?? 0,
        returnedAmount: purchaseSummary?.returnedAmount ?? 0,
        lastPurchaseAt: purchaseSummary?.lastPurchaseAt ?? null,
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

    return {
      items,
      summary: {
        activeCustomers,
        totalCustomers,
        totalOutstanding: toNumber(debtSummary._sum.remainingAmount),
        totalPoints: loyaltySummary._sum.pointsDelta ?? 0,
        totalSpent: toNumber(purchaseSummary._sum.totalAmount),
      },
      pagination: {
        page,
        pageSize,
        totalItems: totalCustomers,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: { search },
    };
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
