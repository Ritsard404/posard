import "server-only";

import { Prisma } from "@prisma/client";

import { auditLogService } from "@/lib/services/audit-log.service";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type {
  expenseCreateSchema,
  expenseTransitionSchema,
  purchaseOrderCreateSchema,
  purchaseOrderReceiveSchema,
  purchaseOrderTransitionSchema,
  promotionCreateSchema,
  promotionTransitionSchema,
  stockAdjustmentSchema,
  supplierArchiveSchema,
  supplierUpsertSchema,
  kitchenTicketTransitionSchema,
  syncIssueTransitionSchema,
  transferCreateSchema,
  transferTransitionSchema,
} from "./management-workflow.schemas";
import type { z } from "zod";

type Viewer = {
  profileId: string;
  companyId: string;
  role: string;
};

async function requireViewer(): Promise<Viewer> {
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

function assertManager(viewer: Viewer) {
  if (viewer.role !== "admin" && viewer.role !== "manager") {
    throw new Error("Manager access is required.");
  }
}

function canApprove(viewer: Viewer) {
  return viewer.role === "admin" || viewer.role === "manager";
}

async function nextReference(prefix: string, companyId: string, table: "expense" | "purchaseOrder" | "receivingRecord" | "branchTransfer") {
  const count =
    table === "expense"
      ? await prisma.expense.count({ where: { companyId } })
      : table === "purchaseOrder"
        ? await prisma.purchaseOrder.count({ where: { companyId } })
        : table === "receivingRecord"
          ? await prisma.receivingRecord.count({ where: { companyId } })
          : await prisma.branchTransfer.count({ where: { companyId } });
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

async function notifyManagers(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    excludeProfileId?: string;
    type: string;
    title: string;
    body: string;
    href: string;
    entityType: string;
    entityId: string;
  },
) {
  const recipients = await tx.profile.findMany({
    where: {
      companyId: input.companyId,
      role: { in: ["admin", "manager"] },
      status: "active",
      ...(input.excludeProfileId ? { id: { not: input.excludeProfileId } } : {}),
    },
    select: { id: true },
  });

  if (recipients.length === 0) return;

  await tx.userNotification.createMany({
    data: recipients.map((recipient) => ({
      profileId: recipient.id,
      companyId: input.companyId,
      category: "APPROVAL",
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      relatedEntityType: input.entityType,
      relatedEntityId: input.entityId,
      deliveryChannel: "IN_APP",
      deliveryStatus: "sent",
    })),
  });
}

async function createStockMovement(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    actorProfileId: string;
    productId: string;
    terminalId?: string | null;
    quantityDelta: number;
    movementType: "adjustment" | "stock_in" | "transfer_out" | "transfer_in" | "receiving_variance";
    sourceType: string;
    sourceId?: string | null;
    referenceNumber?: string | null;
    notes?: string | null;
  },
) {
  const product = await tx.product.findFirst({
    where: { id: input.productId, companyId: input.companyId, isDeleted: false },
    select: { id: true, quantity: true, trackInventory: true },
  });

  if (!product?.trackInventory) {
    throw new Error("Inventory-tracked product is required.");
  }

  const before = Number(product.quantity ?? 0);
  const after = before + input.quantityDelta;

  await tx.product.update({
    where: { id: product.id },
    data: { quantity: new Prisma.Decimal(after) },
  });

  const movement = await tx.stockMovement.create({
    data: {
      companyId: input.companyId,
      terminalId: input.terminalId ?? null,
      productId: product.id,
      createdById: input.actorProfileId,
      movementType: input.movementType,
      quantityDelta: new Prisma.Decimal(input.quantityDelta),
      quantityBefore: new Prisma.Decimal(before),
      quantityAfter: new Prisma.Decimal(after),
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      referenceNumber: input.referenceNumber ?? null,
      notes: input.notes,
    },
  });

  return movement;
}

export const managementWorkflowService = {
  async getFormOptions() {
    const viewer = await requireViewer();
    const [products, terminals, categories, suppliers] = await Promise.all([
      prisma.product.findMany({
        where: { companyId: viewer.companyId, isDeleted: false, trackInventory: true },
        orderBy: { name: "asc" },
        take: 200,
        select: { id: true, name: true, quantity: true, cost: true },
      }),
      prisma.posTerminalInfo.findMany({
        where: { companyId: viewer.companyId },
        orderBy: { posName: "asc" },
        select: { id: true, posName: true },
      }),
      prisma.expenseCategory.findMany({
        where: { companyId: viewer.companyId, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.supplier.findMany({
        where: { companyId: viewer.companyId, status: "active" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    return {
      products: products.map((product) => ({
        ...product,
        quantity: Number(product.quantity ?? 0),
        cost: Number(product.cost ?? 0),
      })),
      terminals,
      categories,
      suppliers,
      canApprove: canApprove(viewer),
      canManageMasterData: viewer.role === "admin" || viewer.role === "manager",
    };
  },

  async createStockAdjustment(input: z.infer<typeof stockAdjustmentSchema>) {
    const viewer = await requireViewer();
    const delta = input.direction === "increase" ? input.quantity : -input.quantity;

    await prisma.$transaction(async (tx) => {
      const movement = await createStockMovement(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        productId: input.productId,
        terminalId: input.terminalId,
        quantityDelta: delta,
        movementType: "adjustment",
        sourceType: "stock_adjustment",
        referenceNumber: `ADJ-${Date.now()}`,
        notes: `${input.reason}${input.notes ? ` - ${input.notes}` : ""}`,
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        posTerminalId: input.terminalId,
        actionType: "stock_adjustment_created",
        referenceId: movement.id,
        changes: JSON.stringify({ productId: input.productId, quantityDelta: delta, reason: input.reason, notes: input.notes }),
      });

      if (Math.abs(delta) >= 10) {
        await notifyManagers(tx, {
          companyId: viewer.companyId,
          excludeProfileId: viewer.profileId,
          type: "stock_adjustment_review",
          title: "Stock adjustment needs review",
          body: `A stock adjustment of ${delta} was recorded and should be reviewed.`,
          href: "/inventory-ledger",
          entityType: "stock_movement",
          entityId: movement.id,
        });
      }
    });
  },

  async createExpense(input: z.infer<typeof expenseCreateSchema>) {
    const viewer = await requireViewer();
    const referenceNumber = await nextReference("EXP", viewer.companyId, "expense");
    const status = input.amount >= 1000 || viewer.role === "cashier" ? "pending_approval" : "approved";

    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          referenceNumber,
          companyId: viewer.companyId,
          terminalId: input.terminalId,
          categoryId: input.categoryId,
          createdById: viewer.profileId,
          expenseDate: input.expenseDate,
          amount: new Prisma.Decimal(input.amount),
          notes: input.notes,
          status,
          approvedById: status === "approved" ? viewer.profileId : null,
        },
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        posTerminalId: input.terminalId,
        actionType: status === "pending_approval" ? "expense_submitted" : "expense_created",
        referenceId: expense.id,
        amount: input.amount,
        changes: JSON.stringify({ referenceNumber, status, notes: input.notes }),
      });

      if (status === "pending_approval") {
        await notifyManagers(tx, {
          companyId: viewer.companyId,
          excludeProfileId: viewer.profileId,
          type: "expense_approval_required",
          title: "Expense awaiting approval",
          body: `${referenceNumber} is waiting for manager approval.`,
          href: "/expenses",
          entityType: "expense",
          entityId: expense.id,
        });
      }
    });
  },

  async transitionExpense(input: z.infer<typeof expenseTransitionSchema>) {
    const viewer = await requireViewer();
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findFirstOrThrow({
        where: { id: input.expenseId, companyId: viewer.companyId },
      });

      let status = expense.status;
      if (input.action === "submit" && expense.status === "draft") status = "pending_approval";
      if (input.action === "approve" && expense.status === "pending_approval") {
        assertManager(viewer);
        status = "approved";
      }
      if (input.action === "reject" && expense.status === "pending_approval") {
        assertManager(viewer);
        status = "rejected";
      }
      if (input.action === "cancel" && expense.status !== "posted") status = "cancelled";
      if (input.action === "post" && expense.status === "approved") {
        assertManager(viewer);
        status = "posted";
      }

      if (status === expense.status) throw new Error("Invalid expense transition.");

      await tx.expense.update({
        where: { id: expense.id },
        data: {
          status,
          approvedById: status === "approved" || status === "posted" ? viewer.profileId : expense.approvedById,
        },
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        posTerminalId: expense.terminalId,
        actionType: `expense_${input.action}`,
        referenceId: expense.id,
        amount: Number(expense.amount),
        changes: JSON.stringify({ from: expense.status, to: status, reason: input.reason }),
      });
    });
  },

  async upsertSupplier(input: z.infer<typeof supplierUpsertSchema>) {
    const viewer = await requireViewer();
    assertManager(viewer);

    await prisma.$transaction(async (tx) => {
      const supplier = input.supplierId
        ? await tx.supplier.update({
            where: { id: input.supplierId },
            data: {
              name: input.name,
              contactName: input.contactName,
              phone: input.phone,
              email: input.email,
              address: input.address,
              notes: input.notes,
            },
          })
        : await tx.supplier.create({
            data: {
              companyId: viewer.companyId,
              name: input.name,
              contactName: input.contactName,
              phone: input.phone,
              email: input.email,
              address: input.address,
              notes: input.notes,
            },
          });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        actionType: input.supplierId ? "supplier_updated" : "supplier_created",
        referenceId: supplier.id,
        changes: JSON.stringify({ name: input.name, contactName: input.contactName, phone: input.phone, email: input.email }),
      });
    });
  },

  async archiveSupplier(input: z.infer<typeof supplierArchiveSchema>) {
    const viewer = await requireViewer();
    assertManager(viewer);

    await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.update({
        where: { id: input.supplierId },
        data: { status: "inactive" },
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        actionType: "supplier_archived",
        referenceId: supplier.id,
        changes: JSON.stringify({ name: supplier.name }),
      });
    });
  },

  async createPurchaseOrder(input: z.infer<typeof purchaseOrderCreateSchema>) {
    const viewer = await requireViewer();
    assertManager(viewer);
    const poNumber = await nextReference("PO", viewer.companyId, "purchaseOrder");

    await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          poNumber,
          companyId: viewer.companyId,
          supplierId: input.supplierId,
          createdById: viewer.profileId,
          expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
          notes: input.notes,
          items: {
            create: [{
              productId: input.productId,
              quantity: new Prisma.Decimal(input.quantity),
              unitCost: new Prisma.Decimal(input.unitCost),
            }],
          },
        },
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        actionType: "purchase_order_created",
        referenceId: order.id,
        amount: input.quantity * input.unitCost,
        changes: JSON.stringify({ poNumber, productId: input.productId, quantity: input.quantity, unitCost: input.unitCost }),
      });
    });
  },

  async transitionPurchaseOrder(input: z.infer<typeof purchaseOrderTransitionSchema>) {
    const viewer = await requireViewer();
    assertManager(viewer);

    await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findFirstOrThrow({
        where: { id: input.purchaseOrderId, companyId: viewer.companyId },
      });
      let status = order.status;
      if (input.action === "submit" && order.status === "draft") status = "submitted";
      if (input.action === "approve" && order.status === "submitted") status = "approved";
      if (input.action === "mark_ordered" && order.status === "approved") status = "ordered";
      if (input.action === "cancel" && !["fully_received", "cancelled"].includes(order.status)) status = "cancelled";
      if (input.action === "close" && order.status === "fully_received") status = "fully_received";
      if (status === order.status) throw new Error("Invalid purchase order transition.");

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status,
          approvedById: status === "approved" ? viewer.profileId : order.approvedById,
        },
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        actionType: `purchase_order_${input.action}`,
        referenceId: order.id,
        changes: JSON.stringify({ poNumber: order.poNumber, from: order.status, to: status }),
      });
    });
  },

  async receivePurchaseOrder(input: z.infer<typeof purchaseOrderReceiveSchema>) {
    const viewer = await requireViewer();
    assertManager(viewer);
    const receivingNumber = await nextReference("RCV", viewer.companyId, "receivingRecord");

    await prisma.$transaction(async (tx) => {
      const item = await tx.purchaseOrderItem.findFirstOrThrow({
        where: {
          id: input.purchaseOrderItemId,
          purchaseOrderId: input.purchaseOrderId,
          purchaseOrder: { companyId: viewer.companyId, status: { in: ["approved", "ordered", "partially_received"] } },
        },
        include: { purchaseOrder: true },
      });

      const ordered = Number(item.quantity);
      const previouslyReceived = Number(item.receivedQuantity);
      const receiveQty = Math.min(input.quantityReceived, Math.max(0, ordered - previouslyReceived));
      if (receiveQty <= 0) throw new Error("No quantity remains to receive.");

      const receiving = await tx.receivingRecord.create({
        data: {
          receivingNumber,
          companyId: viewer.companyId,
          supplierId: item.purchaseOrder.supplierId,
          purchaseOrderId: item.purchaseOrderId,
          postedById: viewer.profileId,
          status: "posted",
          postedAt: new Date(),
          notes: input.notes,
          items: {
            create: [{
              productId: item.productId,
              quantityReceived: new Prisma.Decimal(receiveQty),
              unitCost: item.unitCost,
              varianceQuantity: new Prisma.Decimal(input.quantityReceived - receiveQty),
            }],
          },
        },
      });

      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { receivedQuantity: { increment: new Prisma.Decimal(receiveQty) } },
      });

      const allItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: item.purchaseOrderId },
        select: { quantity: true, receivedQuantity: true, id: true },
      });
      const nextStatus = allItems.every((row) => {
        const received = row.id === item.id ? Number(row.receivedQuantity) + receiveQty : Number(row.receivedQuantity);
        return received >= Number(row.quantity);
      }) ? "fully_received" : "partially_received";

      await tx.purchaseOrder.update({
        where: { id: item.purchaseOrderId },
        data: { status: nextStatus },
      });

      await createStockMovement(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        productId: item.productId,
        quantityDelta: receiveQty,
        movementType: "stock_in",
        sourceType: "receiving",
        sourceId: receiving.id,
        referenceNumber: receivingNumber,
        notes: input.notes,
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        actionType: "purchase_order_received",
        referenceId: item.purchaseOrderId,
        amount: receiveQty * Number(item.unitCost),
        changes: JSON.stringify({ receivingNumber, productId: item.productId, receivedQuantity: receiveQty, poStatus: nextStatus }),
      });
    });
  },

  async createTransfer(input: z.infer<typeof transferCreateSchema>) {
    const viewer = await requireViewer();
    assertManager(viewer);
    const transferNumber = await nextReference("TRF", viewer.companyId, "branchTransfer");

    await prisma.$transaction(async (tx) => {
      const transfer = await tx.branchTransfer.create({
        data: {
          transferNumber,
          companyId: viewer.companyId,
          sourceTerminalId: input.sourceTerminalId,
          destinationTerminalId: input.destinationTerminalId,
          requestedById: viewer.profileId,
          status: "pending_approval",
          notes: input.notes,
          items: {
            create: [{
              productId: input.productId,
              requestedQuantity: new Prisma.Decimal(input.requestedQuantity),
            }],
          },
        },
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        posTerminalId: input.sourceTerminalId,
        actionType: "transfer_requested",
        referenceId: transfer.id,
        changes: JSON.stringify({ transferNumber, productId: input.productId, requestedQuantity: input.requestedQuantity }),
      });

      await notifyManagers(tx, {
        companyId: viewer.companyId,
        excludeProfileId: viewer.profileId,
        type: "transfer_approval_required",
        title: "Transfer awaiting approval",
        body: `${transferNumber} is waiting for approval.`,
        href: "/transfers",
        entityType: "branch_transfer",
        entityId: transfer.id,
      });
    });
  },

  async transitionTransfer(input: z.infer<typeof transferTransitionSchema>) {
    const viewer = await requireViewer();
    assertManager(viewer);

    await prisma.$transaction(async (tx) => {
      const transfer = await tx.branchTransfer.findFirstOrThrow({
        where: { id: input.transferId, companyId: viewer.companyId },
        include: { items: true },
      });
      const firstItem = transfer.items[0];
      if (!firstItem) throw new Error("Transfer item is required.");

      let status = transfer.status;
      if (input.action === "submit" && transfer.status === "draft") status = "pending_approval";
      if (input.action === "approve" && transfer.status === "pending_approval") status = "approved";
      if (input.action === "cancel" && !["received", "cancelled"].includes(transfer.status)) status = "cancelled";
      if (input.action === "dispatch" && transfer.status === "approved") {
        status = "in_transit";
        const dispatchedQty = Number(firstItem.requestedQuantity);
        await tx.branchTransferItem.update({
          where: { id: firstItem.id },
          data: { dispatchedQuantity: new Prisma.Decimal(dispatchedQty) },
        });
        await createStockMovement(tx, {
          companyId: viewer.companyId,
          actorProfileId: viewer.profileId,
          productId: firstItem.productId,
          terminalId: transfer.sourceTerminalId,
          quantityDelta: -dispatchedQty,
          movementType: "transfer_out",
          sourceType: "branch_transfer",
          sourceId: transfer.id,
          referenceNumber: transfer.transferNumber,
          notes: input.notes,
        });
      }
      if (input.action === "receive" && transfer.status === "in_transit") {
        const dispatchedQty = Number(firstItem.dispatchedQuantity ?? firstItem.requestedQuantity);
        const receivedQty = input.receivedQuantity === undefined ? dispatchedQty : Math.min(input.receivedQuantity, dispatchedQty);
        status = receivedQty >= dispatchedQty ? "received" : "partially_received";
        await tx.branchTransferItem.update({
          where: { id: firstItem.id },
          data: {
            receivedQuantity: new Prisma.Decimal(receivedQty),
            varianceQuantity: new Prisma.Decimal(dispatchedQty - receivedQty),
          },
        });
        await createStockMovement(tx, {
          companyId: viewer.companyId,
          actorProfileId: viewer.profileId,
          productId: firstItem.productId,
          terminalId: transfer.destinationTerminalId,
          quantityDelta: receivedQty,
          movementType: "transfer_in",
          sourceType: "branch_transfer",
          sourceId: transfer.id,
          referenceNumber: transfer.transferNumber,
          notes: input.notes,
        });
      }

      if (status === transfer.status) throw new Error("Invalid transfer transition.");

      await tx.branchTransfer.update({
        where: { id: transfer.id },
        data: {
          status,
          approvedById: status === "approved" ? viewer.profileId : transfer.approvedById,
          receivedById: status === "received" || status === "partially_received" ? viewer.profileId : transfer.receivedById,
        },
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        posTerminalId: transfer.sourceTerminalId,
        actionType: `transfer_${input.action}`,
        referenceId: transfer.id,
        changes: JSON.stringify({ transferNumber: transfer.transferNumber, from: transfer.status, to: status, notes: input.notes }),
      });
    });
  },

  async createPromotion(input: z.infer<typeof promotionCreateSchema>) {
    const viewer = await requireViewer();
    assertManager(viewer);

    await prisma.$transaction(async (tx) => {
      const promotion = await tx.promotion.create({
        data: {
          companyId: viewer.companyId,
          name: input.name,
          promotionType: input.promotionType,
          value: new Prisma.Decimal(input.value),
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          isActive: false,
          stackable: input.stackable,
          exclusive: input.exclusive,
          ruleJson: {
            status: "draft",
            notes: input.notes,
            createdById: viewer.profileId,
          },
        },
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        actionType: "promotion_created",
        referenceId: promotion.id,
        amount: input.value,
        changes: JSON.stringify({ name: input.name, promotionType: input.promotionType, status: "draft" }),
      });
    });
  },

  async transitionPromotion(input: z.infer<typeof promotionTransitionSchema>) {
    const viewer = await requireViewer();
    assertManager(viewer);

    await prisma.$transaction(async (tx) => {
      const promotion = await tx.promotion.findFirstOrThrow({
        where: { id: input.promotionId, companyId: viewer.companyId },
      });
      const metadata = typeof promotion.ruleJson === "object" && promotion.ruleJson !== null
        ? promotion.ruleJson as Record<string, unknown>
        : {};

      if (input.action === "duplicate") {
        const duplicate = await tx.promotion.create({
          data: {
            companyId: viewer.companyId,
            name: `${promotion.name} Copy`,
            promotionType: promotion.promotionType,
            value: promotion.value,
            startsAt: promotion.startsAt,
            endsAt: promotion.endsAt,
            isActive: false,
            stackable: promotion.stackable,
            exclusive: promotion.exclusive,
            ruleJson: { ...metadata, status: "draft", duplicatedFrom: promotion.id },
          },
        });

        await auditLogService.create(tx, {
          companyId: viewer.companyId,
          actorProfileId: viewer.profileId,
          actionType: "promotion_duplicated",
          referenceId: duplicate.id,
          changes: JSON.stringify({ from: promotion.id, name: duplicate.name }),
        });
        return;
      }

      const isArchive = input.action === "archive";
      const isActive = input.action === "activate";
      const status = input.action === "activate"
        ? "active"
        : input.action === "pause"
          ? "paused"
          : "archived";

      await tx.promotion.update({
        where: { id: promotion.id },
        data: {
          isActive: isArchive ? false : isActive,
          ruleJson: { ...metadata, status, transitionedById: viewer.profileId, transitionedAt: new Date().toISOString() },
        },
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        actionType: `promotion_${input.action}`,
        referenceId: promotion.id,
        changes: JSON.stringify({ name: promotion.name, status, wasActive: promotion.isActive }),
      });
    });
  },

  async transitionKitchenTicket(input: z.infer<typeof kitchenTicketTransitionSchema>) {
    const viewer = await requireViewer();

    await prisma.$transaction(async (tx) => {
      const ticket = await tx.kitchenTicket.findFirstOrThrow({
        where: { id: input.ticketId, companyId: viewer.companyId },
      });

      let status = ticket.status;
      if (input.action === "start" && ticket.status === "queued") status = "preparing";
      if (input.action === "ready" && ticket.status === "preparing") status = "ready";
      if (input.action === "served" && ticket.status === "ready") status = "served";
      if (input.action === "cancel" && ticket.status !== "served") status = "cancelled";
      if (status === ticket.status) throw new Error("Invalid kitchen ticket transition.");

      await tx.kitchenTicket.update({
        where: { id: ticket.id },
        data: {
          status,
          notes: input.notes ?? ticket.notes,
          updatedById: viewer.profileId,
          readyAt: status === "ready" ? new Date() : ticket.readyAt,
          servedAt: status === "served" ? new Date() : ticket.servedAt,
        },
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        posTerminalId: ticket.terminalId,
        actionType: `kitchen_ticket_${input.action}`,
        referenceId: ticket.id,
        changes: JSON.stringify({ ticketNumber: ticket.ticketNumber, from: ticket.status, to: status, notes: input.notes }),
      });
    });
  },

  async transitionSyncIssue(input: z.infer<typeof syncIssueTransitionSchema>) {
    const viewer = await requireViewer();

    await prisma.$transaction(async (tx) => {
      const issue = await tx.offlineSyncIssue.findFirstOrThrow({
        where: { id: input.issueId, companyId: viewer.companyId },
      });

      const next =
        input.action === "retry"
          ? { syncStatus: "pending" as const, nextRetryAt: new Date(), retryCount: issue.retryCount + 1, resolvedAt: null }
          : input.action === "review"
            ? { syncStatus: "needs_review" as const }
            : input.action === "resolve"
              ? { syncStatus: "resolved" as const, resolvedAt: new Date() }
              : { syncStatus: "dismissed" as const, resolvedAt: new Date() };

      await tx.offlineSyncIssue.update({
        where: { id: issue.id },
        data: {
          ...next,
          message: input.notes ? `${issue.message} | ${input.notes}` : issue.message,
        },
      });

      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.profileId,
        posTerminalId: issue.terminalId,
        actionType: `sync_issue_${input.action}`,
        referenceId: issue.id,
        changes: JSON.stringify({ localId: issue.localId, actionType: issue.actionType, from: issue.syncStatus, to: next.syncStatus, notes: input.notes }),
      });

      if (input.action === "review") {
        await notifyManagers(tx, {
          companyId: viewer.companyId,
          excludeProfileId: viewer.profileId,
          type: "sync_issue_needs_review",
          title: "Sync issue needs review",
          body: `${issue.actionType} on ${issue.localId} needs manager review.`,
          href: "/sync",
          entityType: "offline_sync_issue",
          entityId: issue.id,
        });
      }
    });
  },
};
