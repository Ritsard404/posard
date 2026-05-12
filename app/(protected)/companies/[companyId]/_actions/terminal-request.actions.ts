"use server";

import { revalidatePath } from "next/cache";
import { companyAccessService } from "../_services/company-access.service";
import {
  CreateTerminalRequestSchema,
  UpdateTerminalRequestStatusSchema,
  type CreateTerminalRequestInput,
  type TerminalRequestDTO,
  type UpdateTerminalRequestStatusInput,
} from "../_services/terminal-request.dto";
import { terminalRequestService } from "../_services/terminal-request.service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";

export async function getTerminalRequestsAction(companyId: string): Promise<
  { success: true; data: TerminalRequestDTO[] } | { success: false; error: string }
> {
  try {
    await companyAccessService.assertCompanyAccess(companyId);
    const data = await terminalRequestService.getTerminalRequestsByCompany(companyId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load terminal requests",
    };
  }
}

export async function createTerminalRequestAction(
  companyId: string,
  payload: CreateTerminalRequestInput,
): Promise<{ success: true; data: TerminalRequestDTO } | { success: false; error: string }> {
  try {
    const viewer = await companyAccessService.assertCompanyAccess(companyId);
    await enforceRateLimit({
      bucket: "terminalMutation",
      route: "/companies/[companyId]/terminals",
      action: "CREATE_TERMINAL_REQUEST",
      profileId: viewer.profileId,
      userId: viewer.profileId,
      role: viewer.role,
      companyId,
    });
    const validated = CreateTerminalRequestSchema.parse(payload);
    const data = await terminalRequestService.createTerminalRequest(
      companyId,
      viewer.profileId,
      validated,
    );

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/terminals`);

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create terminal request",
    };
  }
}

export async function updateTerminalRequestStatusAction(
  id: string,
  companyId: string,
  payload: UpdateTerminalRequestStatusInput,
): Promise<{ success: true; data: TerminalRequestDTO } | { success: false; error: string }> {
  try {
    const viewer = await companyAccessService.assertAdminAccess(companyId);
    await enforceRateLimit({
      bucket: "adminMutation",
      route: "/companies/[companyId]/terminals",
      action: "UPDATE_TERMINAL_REQUEST_STATUS",
      profileId: viewer.profileId,
      userId: viewer.profileId,
      role: viewer.role,
      companyId,
    });
    const validated = UpdateTerminalRequestStatusSchema.parse(payload);
    const data = await terminalRequestService.updateTerminalRequestStatus(
      id,
      companyId,
      viewer.profileId,
      validated.status,
    );

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/terminals`);

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update terminal request",
    };
  }
}
