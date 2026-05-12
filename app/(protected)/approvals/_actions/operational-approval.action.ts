"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accountsAccessService } from "@/app/(protected)/accounts/_services/accounts-access.service";
import { operationalApprovalService } from "../_services/operational-approval.service";
import { decideOperationalApprovalSchema } from "../_services/_validators/operational-approval.validator";

const IdSchema = z.string().uuid();

export async function approveOperationalApprovalAction(
  id: string,
  input: unknown,
) {
  try {
    const viewer = await accountsAccessService.getViewer();
    const approvalId = IdSchema.parse(id);
    const validated = decideOperationalApprovalSchema.parse(input);

    await operationalApprovalService.decide(
      viewer,
      approvalId,
      "approved",
      validated,
    );
    revalidatePath("/approvals");

    return { success: true } as const;
  } catch (error) {
    console.error(error);
    return { success: false, error: "Unable to approve request." } as const;
  }
}

export async function rejectOperationalApprovalAction(
  id: string,
  input: unknown,
) {
  try {
    const viewer = await accountsAccessService.getViewer();
    const approvalId = IdSchema.parse(id);
    const validated = decideOperationalApprovalSchema.parse(input);

    await operationalApprovalService.decide(
      viewer,
      approvalId,
      "rejected",
      validated,
    );
    revalidatePath("/approvals");

    return { success: true } as const;
  } catch (error) {
    console.error(error);
    return { success: false, error: "Unable to reject request." } as const;
  }
}
