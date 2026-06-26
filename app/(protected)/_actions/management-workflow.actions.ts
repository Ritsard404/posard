"use server";

import { revalidatePath } from "next/cache";

import { managementWorkflowService } from "../_services/management-workflow.service";
import {
  expenseCreateSchema,
  expenseTransitionSchema,
  nonSalesIncomeCreateSchema,
  purchaseOrderCreateSchema,
  purchaseOrderReceiveSchema,
  purchaseOrderTransitionSchema,
  promotionCreateSchema,
  promotionTransitionSchema,
  stockAdjustmentSchema,
  stockCountCreateSchema,
  stockCountTransitionSchema,
  stockDispositionSchema,
  supplierArchiveSchema,
  supplierUpsertSchema,
  kitchenTicketTransitionSchema,
  syncIssueTransitionSchema,
  transferCreateSchema,
  transferTransitionSchema,
} from "../_services/management-workflow.schemas";

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function failure(error: unknown) {
  console.error(error);
}

export async function createStockAdjustmentAction(formData: FormData): Promise<void> {
  try {
    const input = stockAdjustmentSchema.parse(formObject(formData));
    await managementWorkflowService.createStockAdjustment(input);
    revalidatePath("/inventory-ledger");
  } catch (error) {
    failure(error);
  }
}

export async function createStockCountAction(formData: FormData): Promise<void> {
  try {
    const input = stockCountCreateSchema.parse(formObject(formData));
    await managementWorkflowService.createStockCountSession(input);
    revalidatePath("/inventory-ledger");
  } catch (error) {
    failure(error);
  }
}

export async function transitionStockCountAction(formData: FormData): Promise<void> {
  try {
    const input = stockCountTransitionSchema.parse(formObject(formData));
    await managementWorkflowService.transitionStockCount(input);
    revalidatePath("/inventory-ledger");
  } catch (error) {
    failure(error);
  }
}

export async function createStockDispositionAction(formData: FormData): Promise<void> {
  try {
    const input = stockDispositionSchema.parse(formObject(formData));
    await managementWorkflowService.createStockDisposition(input);
    revalidatePath("/inventory-ledger");
  } catch (error) {
    failure(error);
  }
}

export async function createExpenseAction(formData: FormData): Promise<void> {
  try {
    const input = expenseCreateSchema.parse(formObject(formData));
    await managementWorkflowService.createExpense(input);
    revalidatePath("/expenses");
  } catch (error) {
    failure(error);
  }
}

export async function transitionExpenseAction(formData: FormData): Promise<void> {
  try {
    const input = expenseTransitionSchema.parse(formObject(formData));
    await managementWorkflowService.transitionExpense(input);
    revalidatePath("/expenses");
  } catch (error) {
    failure(error);
  }
}

export async function createNonSalesIncomeAction(formData: FormData): Promise<void> {
  try {
    const input = nonSalesIncomeCreateSchema.parse(formObject(formData));
    await managementWorkflowService.createNonSalesIncome(input);
    revalidatePath("/expenses");
    revalidatePath("/reports/non-sales-income");
  } catch (error) {
    failure(error);
  }
}

export async function upsertSupplierAction(formData: FormData): Promise<void> {
  try {
    const input = supplierUpsertSchema.parse(formObject(formData));
    await managementWorkflowService.upsertSupplier(input);
    revalidatePath("/suppliers");
  } catch (error) {
    failure(error);
  }
}

export async function archiveSupplierAction(formData: FormData): Promise<void> {
  try {
    const input = supplierArchiveSchema.parse(formObject(formData));
    await managementWorkflowService.archiveSupplier(input);
    revalidatePath("/suppliers");
  } catch (error) {
    failure(error);
  }
}

export async function createPurchaseOrderAction(formData: FormData): Promise<void> {
  try {
    const input = purchaseOrderCreateSchema.parse(formObject(formData));
    await managementWorkflowService.createPurchaseOrder(input);
    revalidatePath("/purchase-orders");
  } catch (error) {
    failure(error);
  }
}

export async function transitionPurchaseOrderAction(formData: FormData): Promise<void> {
  try {
    const input = purchaseOrderTransitionSchema.parse(formObject(formData));
    await managementWorkflowService.transitionPurchaseOrder(input);
    revalidatePath("/purchase-orders");
    revalidatePath("/inventory-ledger");
  } catch (error) {
    failure(error);
  }
}

export async function receivePurchaseOrderAction(formData: FormData): Promise<void> {
  try {
    const input = purchaseOrderReceiveSchema.parse(formObject(formData));
    await managementWorkflowService.receivePurchaseOrder(input);
    revalidatePath("/purchase-orders");
    revalidatePath("/inventory-ledger");
  } catch (error) {
    failure(error);
  }
}

export async function createTransferAction(formData: FormData): Promise<void> {
  try {
    const input = transferCreateSchema.parse(formObject(formData));
    await managementWorkflowService.createTransfer(input);
    revalidatePath("/transfers");
  } catch (error) {
    failure(error);
  }
}

export async function transitionTransferAction(formData: FormData): Promise<void> {
  try {
    const input = transferTransitionSchema.parse(formObject(formData));
    await managementWorkflowService.transitionTransfer(input);
    revalidatePath("/transfers");
    revalidatePath("/inventory-ledger");
  } catch (error) {
    failure(error);
  }
}

export async function createPromotionAction(formData: FormData): Promise<void> {
  try {
    const input = promotionCreateSchema.parse(formObject(formData));
    await managementWorkflowService.createPromotion(input);
    revalidatePath("/promotions");
  } catch (error) {
    failure(error);
  }
}

export async function transitionPromotionAction(formData: FormData): Promise<void> {
  try {
    const input = promotionTransitionSchema.parse(formObject(formData));
    await managementWorkflowService.transitionPromotion(input);
    revalidatePath("/promotions");
  } catch (error) {
    failure(error);
  }
}

export async function transitionKitchenTicketAction(formData: FormData): Promise<void> {
  try {
    const input = kitchenTicketTransitionSchema.parse(formObject(formData));
    await managementWorkflowService.transitionKitchenTicket(input);
    revalidatePath("/kitchen");
  } catch (error) {
    failure(error);
  }
}

export async function transitionSyncIssueAction(formData: FormData): Promise<void> {
  try {
    const input = syncIssueTransitionSchema.parse(formObject(formData));
    await managementWorkflowService.transitionSyncIssue(input);
    revalidatePath("/sync");
  } catch (error) {
    failure(error);
  }
}
