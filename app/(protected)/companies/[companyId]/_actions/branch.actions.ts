"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { companyAccessService } from "../_services/company-access.service";
import { branchService } from "../_services/branch.service";
import { BranchUpsertSchema } from "../_services/branch.dto";

type BranchActionResult = { success: true } | { success: false; error: string };

const BranchIdSchema = z.string().uuid("A valid branch is required");

function sanitizeBranchError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (
    error.message === "Forbidden" ||
    error.message === "Branch not found" ||
    error.message.includes("already exists")
  ) {
    return error.message;
  }

  console.error(error);
  return fallback;
}

function revalidateBranchPaths(companyId: string) {
  revalidatePath(`/companies/${companyId}`);
  revalidatePath(`/companies/${companyId}/branches`);
  revalidatePath(`/companies/${companyId}/terminals`);
}

export async function createBranchAction(
  companyId: string,
  input: unknown,
): Promise<BranchActionResult> {
  try {
    const viewer = await companyAccessService.assertCompanyAccess(companyId);
    const payload = BranchUpsertSchema.parse(input);
    await branchService.createBranch(viewer, companyId, payload);
    revalidateBranchPaths(companyId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: sanitizeBranchError(error, "Failed to create branch"),
    };
  }
}

export async function updateBranchAction(
  companyId: string,
  branchId: string,
  input: unknown,
): Promise<BranchActionResult> {
  try {
    const viewer = await companyAccessService.assertCompanyAccess(companyId);
    const validatedBranchId = BranchIdSchema.parse(branchId);
    const payload = BranchUpsertSchema.parse(input);
    await branchService.updateBranch(viewer, companyId, validatedBranchId, payload);
    revalidateBranchPaths(companyId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: sanitizeBranchError(error, "Failed to update branch"),
    };
  }
}

export async function disableBranchAction(
  companyId: string,
  branchId: string,
): Promise<BranchActionResult> {
  try {
    const viewer = await companyAccessService.assertCompanyAccess(companyId);
    const validatedBranchId = BranchIdSchema.parse(branchId);
    await branchService.disableBranch(viewer, companyId, validatedBranchId);
    revalidateBranchPaths(companyId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: sanitizeBranchError(error, "Failed to disable branch"),
    };
  }
}
