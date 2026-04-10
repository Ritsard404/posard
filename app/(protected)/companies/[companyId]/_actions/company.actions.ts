"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { companyService } from "../_services/company.service";
import { UpdateCompanySchema, type UpdateCompanyInput, type CompanyDTO } from "../_services/company.dto";
import { revalidatePath } from "next/cache";

async function verifyAccess(targetCompanyId?: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: { id: true, companyId: true, role: true },
  });

  if (!profile) throw new Error("Profile not found");

  if (profile.role === "admin") return profile; // Admin can do anything
  
  // Manager can only access their own company
  if (targetCompanyId && profile.companyId !== targetCompanyId) {
    throw new Error("Forbidden: You do not have access to this company");
  }

  return profile;
}

export async function getCompaniesAction(): Promise<{ success: true; data: CompanyDTO[] } | { success: false; error: string }> {
  try {
    const profile = await verifyAccess();
    if (profile.role !== "admin") throw new Error("Forbidden: Only admins can view all companies");

    const data = await companyService.getCompanies();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load companies" };
  }
}

export async function getCompanyAction(companyId: string): Promise<{ success: true; data: CompanyDTO } | { success: false; error: string }> {
  try {
    await verifyAccess(companyId);
    const data = await companyService.getCompanyById(companyId);
    if (!data) throw new Error("Company not found");
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load company" };
  }
}

export async function updateCompanyAction(companyId: string, payload: UpdateCompanyInput): Promise<{ success: true; data: CompanyDTO } | { success: false; error: string }> {
  try {
    await verifyAccess(companyId);
    
    const validated = UpdateCompanySchema.parse(payload);
    const data = await companyService.updateCompany(companyId, validated);
    
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/settings`);
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update company" };
  }
}
