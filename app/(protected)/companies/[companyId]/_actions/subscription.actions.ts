"use server";

import { revalidatePath } from "next/cache";
import { companyAccessService } from "../_services/company-access.service";
import { subscriptionService } from "../_services/subscription.service";
import {
  UpsertTerminalSubscriptionSchema,
  type TerminalSubscriptionDTO,
  type UpsertTerminalSubscriptionPayload,
} from "../_services/subscription.dto";

export async function getSubscriptionsAction(companyId: string): Promise<
  { success: true; data: TerminalSubscriptionDTO[] } | { success: false; error: string }
> {
  try {
    await companyAccessService.assertAdminAccess(companyId);
    const data = await subscriptionService.getSubscriptionsByCompany(companyId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load subscriptions",
    };
  }
}

export async function upsertSubscriptionAction(
  companyId: string,
  terminalId: string,
  payload: UpsertTerminalSubscriptionPayload,
): Promise<{ success: true; data: TerminalSubscriptionDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertAdminAccess(companyId);
    const validated = UpsertTerminalSubscriptionSchema.parse(payload);
    const data = await subscriptionService.upsertSubscription(companyId, terminalId, validated);

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/subscription`);

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save subscription",
    };
  }
}
