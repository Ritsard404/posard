"use server";

import { terminalService } from "../_services/terminal.service";
import {
  CreateTerminalSchema,
  TerminalConfigurationSchema,
  UpdateTerminalSchema,
  type CreateTerminalPayload,
  type TerminalConfigurationPayload,
  type UpdateTerminalPayload,
  type TerminalDTO,
} from "../_services/terminal.dto";
import { companyAccessService } from "../_services/company-access.service";
import { revalidatePath } from "next/cache";

export async function getTerminalsAction(companyId: string): Promise<{ success: true; data: TerminalDTO[] } | { success: false; error: string }> {
  try {
    await companyAccessService.assertCompanyAccess(companyId);
    const data = await terminalService.getTerminalsByCompany(companyId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load terminals" };
  }
}

export async function createTerminalAction(companyId: string, payload: CreateTerminalPayload): Promise<{ success: true; data: TerminalDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertAdminAccess(companyId);
    const validated = CreateTerminalSchema.parse(payload);
    const data = await terminalService.createTerminal(companyId, validated);
    
    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/terminals`);
    revalidatePath(`/companies/${companyId}/subscription`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create terminal" };
  }
}

export async function updateTerminalAction(id: string, companyId: string, payload: UpdateTerminalPayload): Promise<{ success: true; data: TerminalDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertAdminAccess(companyId);
    const validated = UpdateTerminalSchema.parse(payload);
    const data = await terminalService.updateTerminal(id, companyId, validated);
    
    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/terminals`);
    revalidatePath(`/companies/${companyId}/subscription`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update terminal" };
  }
}

export async function updateTerminalConfigurationAction(
  id: string,
  companyId: string,
  payload: TerminalConfigurationPayload,
): Promise<{ success: true; data: TerminalDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertCompanyAccess(companyId);
    const validated = TerminalConfigurationSchema.parse(payload);
    const data = await terminalService.updateTerminalConfiguration(id, companyId, validated);

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/terminals`);
    revalidatePath(`/companies/${companyId}/subscription`);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update terminal configuration",
    };
  }
}

export async function updateTerminalTrainingModeAction(
  id: string,
  companyId: string,
  isTrainMode: boolean,
): Promise<{ success: true; data: TerminalDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertCompanyAccess(companyId);
    const data = await terminalService.setTrainingMode(id, companyId, isTrainMode);

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/terminals`);
    revalidatePath(`/companies/${companyId}/subscription`);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update training mode",
    };
  }
}

export async function deleteTerminalAction(id: string, companyId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await companyAccessService.assertAdminAccess(companyId);
    await terminalService.deleteTerminal(id, companyId);
    
    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/terminals`);
    revalidatePath(`/companies/${companyId}/subscription`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete terminal" };
  }
}
