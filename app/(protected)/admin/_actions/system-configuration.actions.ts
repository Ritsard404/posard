"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accountsAccessService } from "@/app/(protected)/accounts/_services/accounts-access.service";
import { systemConfigurationService } from "../_services/system-configuration.service";

const SystemConfigurationSchema = z.object({
  directRegistrationEnabled: z.boolean(),
});

export async function updateSystemConfigurationAction(input: unknown) {
  try {
    const viewer = await accountsAccessService.getViewer();
    const validated = SystemConfigurationSchema.parse(input);
    const data = await systemConfigurationService.update(viewer, validated);
    revalidatePath("/admin/settings");
    revalidatePath("/auth/sign-up");
    return { success: true, data } as const;
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Unable to update system settings.",
    } as const;
  }
}
