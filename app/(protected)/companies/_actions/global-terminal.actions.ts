"use server";

import { revalidatePath } from "next/cache";
import { companyAccessService } from "../[companyId]/_services/company-access.service";
import { terminalService } from "../[companyId]/_services/terminal.service";
import { SetTerminalActiveSchema, type SetTerminalActiveInput, type TerminalDTO } from "../[companyId]/_services/terminal.dto";

export async function toggleGlobalTerminalAction(
  terminalId: string,
  companyId: string,
  payload: SetTerminalActiveInput,
): Promise<{ success: true; data: TerminalDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertAdminAccess(companyId);
    const validated = SetTerminalActiveSchema.parse(payload);
    const data = await terminalService.setTerminalActive(terminalId, companyId, validated);
    revalidatePath("/terminals");
    revalidatePath("/subscriptions");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/terminals`);
    revalidatePath(`/companies/${companyId}/subscription`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update terminal" };
  }
}

