"use server";

import { terminalService } from "../_services/terminal.service";
import {
  CreateTerminalSchema,
  SetTerminalActiveSchema,
  TerminalConfigurationSchema,
  UpdateTerminalSchema,
  type CreateTerminalPayload,
  type SetTerminalActiveInput,
  type TerminalConfigurationPayload,
  type UpdateTerminalPayload,
  type TerminalDTO,
} from "../_services/terminal.dto";
import { companyAccessService } from "../_services/company-access.service";
import { revalidatePath } from "next/cache";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";

async function enforceTerminalMutationLimit(input: {
  action: string;
  companyId: string;
  terminalId?: string | null;
  adminOnly?: boolean;
}) {
  const viewer = input.adminOnly
    ? await companyAccessService.assertAdminAccess(input.companyId)
    : await companyAccessService.assertCompanyAccess(input.companyId);

  await enforceRateLimit({
    bucket: input.adminOnly ? "adminMutation" : "terminalMutation",
    route: "/companies/[companyId]/terminals",
    action: input.action,
    profileId: viewer.profileId,
    userId: viewer.profileId,
    role: viewer.role,
    companyId: input.companyId,
    terminalId: input.terminalId,
  });

  return viewer;
}

export async function getTerminalsAction(companyId: string): Promise<{ success: true; data: TerminalDTO[] } | { success: false; error: string }> {
  try {
    await companyAccessService.assertCompanyAccess(companyId);
    const data = await terminalService.getTerminalsByCompany(companyId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load terminals" };
  }
}

export async function getTerminalAction(id: string, companyId: string): Promise<{ success: true; data: TerminalDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertCompanyAccess(companyId);
    const data = await terminalService.getTerminalById(id, companyId);
    if (!data) {
      throw new Error("Terminal not found");
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load terminal" };
  }
}

export async function createTerminalAction(companyId: string, payload: CreateTerminalPayload): Promise<{ success: true; data: TerminalDTO } | { success: false; error: string }> {
  try {
    await enforceTerminalMutationLimit({ action: "CREATE_TERMINAL", companyId, adminOnly: true });
    const validated = CreateTerminalSchema.parse(payload);
    const data = await terminalService.createTerminal(companyId, validated);
    
    revalidatePath("/companies");
    revalidatePath("/terminals");
    revalidatePath("/subscriptions");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/branches`);
    revalidatePath(`/companies/${companyId}/terminals`);
    revalidatePath(`/companies/${companyId}/subscription`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create terminal" };
  }
}

export async function updateTerminalAction(id: string, companyId: string, payload: UpdateTerminalPayload): Promise<{ success: true; data: TerminalDTO } | { success: false; error: string }> {
  try {
    await enforceTerminalMutationLimit({ action: "UPDATE_TERMINAL", companyId, terminalId: id, adminOnly: true });
    const validated = UpdateTerminalSchema.parse(payload);
    const data = await terminalService.updateTerminal(id, companyId, validated);
    
    revalidatePath("/companies");
    revalidatePath("/terminals");
    revalidatePath("/subscriptions");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/branches`);
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
    await enforceTerminalMutationLimit({ action: "UPDATE_TERMINAL_CONFIGURATION", companyId, terminalId: id });
    const validated = TerminalConfigurationSchema.parse(payload);
    const data = await terminalService.updateTerminalConfiguration(id, companyId, validated);

    revalidatePath("/companies");
    revalidatePath("/terminals");
    revalidatePath("/subscriptions");
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
    await enforceTerminalMutationLimit({ action: "UPDATE_TERMINAL_TRAINING_MODE", companyId, terminalId: id });
    const data = await terminalService.setTrainingMode(id, companyId, isTrainMode);

    revalidatePath("/companies");
    revalidatePath("/terminals");
    revalidatePath("/subscriptions");
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
    await enforceTerminalMutationLimit({ action: "DELETE_TERMINAL", companyId, terminalId: id, adminOnly: true });
    await terminalService.deleteTerminal(id, companyId);
    
    revalidatePath("/companies");
    revalidatePath("/terminals");
    revalidatePath("/subscriptions");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/terminals`);
    revalidatePath(`/companies/${companyId}/subscription`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete terminal" };
  }
}

export async function setTerminalActiveAction(
  id: string,
  companyId: string,
  payload: SetTerminalActiveInput,
): Promise<{ success: true; data: TerminalDTO } | { success: false; error: string }> {
  try {
    await enforceTerminalMutationLimit({ action: "SET_TERMINAL_ACTIVE", companyId, terminalId: id, adminOnly: true });
    const validated = SetTerminalActiveSchema.parse(payload);
    const data = await terminalService.setTerminalActive(id, companyId, validated);

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/terminals`);
    revalidatePath(`/companies/${companyId}/subscription`);
    revalidatePath("/terminals");
    revalidatePath("/subscriptions");
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update terminal status",
    };
  }
}
