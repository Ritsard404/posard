"use server";

import { revalidatePath } from "next/cache";
import { accountsAccessService } from "@/app/(protected)/accounts/_services/accounts-access.service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { registrationApprovalService } from "../_services/registration-approval.service";
import {
  RegistrationRequestIdSchema,
  RejectRegistrationRequestSchema,
} from "../_services/_validators/registration-approval.validator";

type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type VoidResult = { success: true } | { success: false; error: string };

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateApprovalPaths() {
  revalidatePath("/approvals");
  revalidatePath("/dashboard");
}

export async function getPendingRegistrationRequestsAction(): Promise<
  DataResult<Awaited<ReturnType<typeof registrationApprovalService.getPendingRequests>>>
> {
  try {
    const viewer = await accountsAccessService.getProfileViewer();
    const data = await registrationApprovalService.getPendingRequests(viewer);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load registration requests."),
    };
  }
}

export async function approveRegistrationRequestAction(
  requestId: string,
): Promise<VoidResult> {
  try {
    const viewer = await accountsAccessService.getProfileViewer();
    await enforceRateLimit({
      bucket: "adminMutation",
      route: "/approvals",
      action: "APPROVE_REGISTRATION_REQUEST",
      profileId: viewer.profileId,
      userId: viewer.profileId,
      role: viewer.role,
      companyId: viewer.companyId,
    });
    const validatedId = RegistrationRequestIdSchema.parse(requestId);
    await registrationApprovalService.approveRequest(viewer, validatedId);
    revalidateApprovalPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: toErrorMessage(error, "Failed to approve registration request."),
    };
  }
}

export async function rejectRegistrationRequestAction(
  requestId: string,
  input: unknown,
): Promise<VoidResult> {
  try {
    const viewer = await accountsAccessService.getProfileViewer();
    await enforceRateLimit({
      bucket: "adminMutation",
      route: "/approvals",
      action: "REJECT_REGISTRATION_REQUEST",
      profileId: viewer.profileId,
      userId: viewer.profileId,
      role: viewer.role,
      companyId: viewer.companyId,
    });
    const validatedId = RegistrationRequestIdSchema.parse(requestId);
    const validated = RejectRegistrationRequestSchema.parse(input);
    await registrationApprovalService.rejectRequest(viewer, validatedId, validated);
    revalidateApprovalPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: toErrorMessage(error, "Failed to reject registration request."),
    };
  }
}

export async function unlockRejectedRegistrationRequestAction(
  requestId: string,
): Promise<VoidResult> {
  try {
    const viewer = await accountsAccessService.getProfileViewer();
    await enforceRateLimit({
      bucket: "adminMutation",
      route: "/approvals",
      action: "UNLOCK_REGISTRATION_REQUEST",
      profileId: viewer.profileId,
      userId: viewer.profileId,
      role: viewer.role,
      companyId: viewer.companyId,
    });
    const validatedId = RegistrationRequestIdSchema.parse(requestId);
    await registrationApprovalService.unlockRejectedRequest(viewer, validatedId);
    revalidateApprovalPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: toErrorMessage(error, "Failed to allow re-registration."),
    };
  }
}
