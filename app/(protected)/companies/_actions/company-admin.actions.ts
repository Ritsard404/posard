"use server";

import { revalidatePath } from "next/cache";
import { companyAccessService } from "../[companyId]/_services/company-access.service";
import type { CompanyDTO } from "../[companyId]/_services/company.dto";
import {
  AdminCompanyUpsertSchema,
  type AdminCompanyUpsertInput,
} from "../_services/_dto/admin-company.dto";
import { adminCompanyService } from "../_services/admin-company.service";
import { deletePosardImageAction } from "@/lib/storage/image-storage.actions";

export async function createAdminCompanyAction(
  payload: AdminCompanyUpsertInput,
): Promise<{ success: true; data: CompanyDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertAdminAccess();
    const validated = AdminCompanyUpsertSchema.parse(payload);
    const data = await adminCompanyService.createCompany(validated);
    revalidateAdminCompanyPaths(data.id);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create company" };
  }
}

export async function updateAdminCompanyAction(
  companyId: string,
  payload: AdminCompanyUpsertInput,
): Promise<{ success: true; data: CompanyDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertAdminAccess(companyId);
    const validated = AdminCompanyUpsertSchema.parse(payload);
    const existing = await adminCompanyService.getCompanyById(companyId);
    const data = await adminCompanyService.updateCompany(companyId, validated);
    if (existing?.logoImageUrl && existing.logoImageUrl !== data.logoImageUrl) {
      await deletePosardImageAction(existing.logoImageUrl);
    }
    revalidateAdminCompanyPaths(companyId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update company" };
  }
}

export async function deleteAdminCompanyAction(
  companyId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await companyAccessService.assertAdminAccess(companyId);
    await adminCompanyService.deleteCompany(companyId);
    revalidateAdminCompanyPaths(companyId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete company" };
  }
}

function revalidateAdminCompanyPaths(companyId: string) {
  revalidatePath("/companies");
  revalidatePath("/terminals");
  revalidatePath("/subscriptions");
  revalidatePath(`/companies/${companyId}`);
  revalidatePath(`/companies/${companyId}/settings`);
  revalidatePath(`/companies/${companyId}/terminals`);
  revalidatePath(`/companies/${companyId}/subscription`);
}
