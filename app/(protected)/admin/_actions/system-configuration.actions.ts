"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accountsAccessService } from "@/app/(protected)/accounts/_services/accounts-access.service";
import { systemConfigurationService } from "../_services/system-configuration.service";

const SystemConfigurationSchema = z.object({
  directRegistrationEnabled: z.boolean(),
  platformBillingMode: z.enum(["FREE", "PAID"]),
  donationEnabled: z.boolean(),
  donationTitle: z.string().trim().max(120).nullable(),
  donationMessage: z.string().trim().max(500).nullable(),
  donationImageUrl: z.string().trim().max(500).nullable(),
  donationProviderName: z.string().trim().max(120).nullable(),
  donationAccountHolder: z.string().trim().max(160).nullable(),
  donationAccountDetail: z.string().trim().max(240).nullable(),
  donationNotes: z.string().trim().max(1000).nullable(),
});

export async function updateSystemConfigurationAction(input: unknown) {
  try {
    const viewer = await accountsAccessService.getViewer();
    const validated = SystemConfigurationSchema.parse(input);
    const data = await systemConfigurationService.update(viewer, validated);
    revalidatePath("/admin/settings");
    revalidatePath("/auth/sign-up");
    revalidatePath("/pricing");
    revalidatePath("/subscriptions");
    return { success: true, data } as const;
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Unable to update system settings.",
    } as const;
  }
}
