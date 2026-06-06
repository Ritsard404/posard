"use server";

import { revalidatePath } from "next/cache";
import {
  createCustomerSchema,
  debtListFiltersSchema,
  recordDebtPaymentSchema,
} from "../_services/debt.dto";
import { debtService } from "../_services/debt.service";
import { toSafeActionError } from "@/lib/security/safe-action-error";

export async function createDebtCustomerAction(payload: unknown) {
  try {
    const input = createCustomerSchema.parse(payload);
    const customer = await debtService.createCustomer(input);
    revalidatePath("/debts");
    revalidatePath("/pos");
    return { success: true as const, customer };
  } catch (error) {
    return {
      success: false as const,
      error: toSafeActionError(error, "Unable to create customer."),
    };
  }
}

export async function getDebtWorkspaceAction(payload?: unknown) {
  try {
    const input = debtListFiltersSchema.parse(payload ?? {});
    const data = await debtService.getWorkspace(input);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: toSafeActionError(error, "Unable to load debts."),
    };
  }
}

export async function listDebtCustomersAction() {
  try {
    const customers = await debtService.listCustomers();
    return { success: true as const, customers };
  } catch (error) {
    return {
      success: false as const,
      error: toSafeActionError(error, "Unable to load customers."),
    };
  }
}

export async function recordDebtPaymentAction(payload: unknown) {
  try {
    const input = recordDebtPaymentSchema.parse(payload);
    await debtService.recordPayment(input);
    revalidatePath("/debts");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: toSafeActionError(error, "Unable to record debt payment."),
    };
  }
}
