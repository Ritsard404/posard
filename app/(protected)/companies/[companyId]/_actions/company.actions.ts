"use server";

import { companyService } from "../_services/company.service";
import {
  UpdateCompanySchema,
  type UpdateCompanyInput,
  type CompanyDetailDTO,
  type CompanyListItemDTO,
  CompanyDTO,
} from "../_services/company.dto";
import { companyAccessService } from "../_services/company-access.service";
import { revalidatePath } from "next/cache";

export async function getCompaniesAction(): Promise<
  { success: true; data: CompanyListItemDTO[] } | { success: false; error: string }
> {
  try {
    await companyAccessService.assertAdminAccess();

    const data = await companyService.getCompanies();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load companies" };
  }
}

export async function getCompanyAction(companyId: string): Promise<
  { success: true; data: CompanyDetailDTO } | { success: false; error: string }
> {
  try {
    await companyAccessService.assertCompanyAccess(companyId);
    const data = await companyService.getCompanyById(companyId);
    if (!data) throw new Error("Company not found");
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load company" };
  }
}

export async function updateCompanyAction(companyId: string, payload: UpdateCompanyInput): Promise<{ success: true; data: CompanyDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertCompanyAccess(companyId);

    const validated = UpdateCompanySchema.parse(payload);
    const data = await companyService.updateCompany(companyId, validated);
    
    revalidatePath("/companies");
    revalidatePath("/terminals");
    revalidatePath("/subscriptions");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/settings`);
    revalidatePath(`/companies/${companyId}/terminals`);
    revalidatePath(`/companies/${companyId}/subscription`);
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update company" };
  }
}
