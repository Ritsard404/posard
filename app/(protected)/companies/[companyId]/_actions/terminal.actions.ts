"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { terminalService } from "../_services/terminal.service";
import { CreateTerminalSchema, UpdateTerminalSchema, type CreateTerminalInput, type UpdateTerminalInput, type TerminalDTO } from "../_services/terminal.dto";
import { revalidatePath } from "next/cache";

async function verifyAccess(targetCompanyId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: { id: true, companyId: true, role: true },
  });

  if (!profile) throw new Error("Profile not found");
  if (profile.role === "admin") return profile;
  
  if (profile.companyId !== targetCompanyId) {
    throw new Error("Forbidden: You do not have access to this company");
  }

  return profile;
}

export async function getTerminalsAction(companyId: string): Promise<{ success: true; data: TerminalDTO[] } | { success: false; error: string }> {
  try {
    await verifyAccess(companyId);
    const data = await terminalService.getTerminalsByCompany(companyId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load terminals" };
  }
}

export async function createTerminalAction(companyId: string, payload: CreateTerminalInput): Promise<{ success: true; data: TerminalDTO } | { success: false; error: string }> {
  try {
    await verifyAccess(companyId);
    const validated = CreateTerminalSchema.parse(payload);
    const data = await terminalService.createTerminal(companyId, validated);
    
    revalidatePath(`/companies/${companyId}/terminals`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create terminal" };
  }
}

export async function updateTerminalAction(id: string, companyId: string, payload: UpdateTerminalInput): Promise<{ success: true; data: TerminalDTO } | { success: false; error: string }> {
  try {
    await verifyAccess(companyId);
    const validated = UpdateTerminalSchema.parse(payload);
    const data = await terminalService.updateTerminal(id, companyId, validated);
    
    revalidatePath(`/companies/${companyId}/terminals`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update terminal" };
  }
}

export async function deleteTerminalAction(id: string, companyId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await verifyAccess(companyId);
    await terminalService.deleteTerminal(id, companyId);
    
    revalidatePath(`/companies/${companyId}/terminals`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete terminal" };
  }
}
