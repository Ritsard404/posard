"use server";

import { registrationRequestService } from "../_services/registration-request.service";
import {
  RegistrationRequestEmailSchema,
  SubmitRegistrationRequestSchema,
} from "../_services/_validators/registration-request.validator";

type VoidResult = { success: true } | { success: false; error: string };

type RegistrationLookupResult =
  | {
      success: true;
      data: {
        status: "pending" | "approved" | "rejected" | "none";
        rejectionReason: string | null;
      };
    }
  | { success: false; error: string };

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function submitRegistrationRequestAction(
  input: unknown,
): Promise<VoidResult> {
  try {
    const validated = SubmitRegistrationRequestSchema.parse(input);
    await registrationRequestService.submitRequest(validated);
    return { success: true };
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
