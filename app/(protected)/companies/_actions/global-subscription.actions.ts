"use server";

import { revalidatePath } from "next/cache";
import { companyAccessService } from "../[companyId]/_services/company-access.service";
import { subscriptionService } from "../[companyId]/_services/subscription.service";
import {
  UpsertTerminalSubscriptionSchema,
  type TerminalSubscriptionDTO,
  type UpsertTerminalSubscriptionPayload,
} from "../[companyId]/_services/subscription.dto";

export async function upsertGlobalSubscriptionAction(
  companyId: string,
  terminalId: string,
  payload: UpsertTerminalSubscriptionPayload,
): Promise<{ success: true; data: TerminalSubscriptionDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertAdminAccess(companyId);
    const validated = UpsertTerminalSubscriptionSchema.parse(payload);
    const data = await subscriptionService.upsertSubscription(companyId, terminalId, validated);
    revalidateSubscriptionPaths(companyId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save subscription" };
  }
}

export async function cancelGlobalSubscriptionAction(
  companyId: string,
  terminalId: string,
): Promise<{ success: true; data: TerminalSubscriptionDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertAdminAccess(companyId);
    const data = await subscriptionService.cancelSubscription(companyId, terminalId);
    revalidateSubscriptionPaths(companyId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to cancel subscription" };
  }
}

function revalidateSubscriptionPaths(companyId: string) {
  revalidatePath("/subscriptions");
  revalidatePath("/terminals");
  revalidatePath(`/companies/${companyId}`);
  revalidatePath(`/companies/${companyId}/terminals`);
  revalidatePath(`/companies/${companyId}/subscription`);
}
