"use server";

import { registrationRequestService } from "../_services/registration-request.service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import {
  RegistrationRequestEmailSchema,
  SubmitRegistrationRequestSchema,
} from "../_services/_validators/registration-request.validator";

type SubmitRegistrationResult =
  | {
      success: true;
      data: { mode: "pending_approval" } | { mode: "direct"; email: string };
    }
  | { success: false; error: string };

type RegistrationLookupResult =
  | {
      success: true;
      data: {
        status: "pending" | "approved" | "rejected" | "none";
        rejectionReason: string | null;
        canRegisterAgainAt: string | null;
      };
    }
  | { success: false; error: string };

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function submitRegistrationRequestAction(
  input: unknown,
): Promise<SubmitRegistrationResult> {
  try {
    const validated = SubmitRegistrationRequestSchema.parse(input);
    await enforceRateLimit({
      bucket: "signup",
      route: "/auth/sign-up",
      action: "REGISTRATION_REQUEST_SUBMIT",
    });
    const data = await registrationRequestService.submitRequest(validated);
    return { success: true, data };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: toErrorMessage(
        error,
        "Unable to submit your registration request. Please try again.",
      ),
    };
  }
}

export async function getRegistrationRequestLoginStatusAction(
  input: unknown,
): Promise<RegistrationLookupResult> {
  try {
    const validated = RegistrationRequestEmailSchema.parse(input);
    await enforceRateLimit({
      bucket: "login",
      route: "/auth/login/status",
      action: "REGISTRATION_STATUS_LOOKUP",
    });
    const data = await registrationRequestService.getLoginStatusByEmail(
      validated.email,
    );
    return { success: true, data };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: toErrorMessage(error, "Unable to check registration status."),
    };
  }
}
