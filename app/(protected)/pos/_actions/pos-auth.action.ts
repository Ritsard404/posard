"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function unlockTerminalAction(pin: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const profile = await prisma.profile.findFirst({
      where: { userId: user.id },
    });

    if (!profile || !profile.companyId) return { success: false, error: "Profile or company not found" };

    // Since we are verifying the manager/cashier's PIN
    // In our simplified setup, we check if the provided pin matches a profile in the same company
    const matchingProfile = await prisma.profile.findFirst({
      where: {
        companyId: profile.companyId,
        pin: pin,
        status: "active" // Wait, 'active'? Default was 'pending', but maybe they approve it. Let's not restrict by 'active' if they just set it up.
      }
    });

    // We can just find by PIN in the company
    const unlocker = await prisma.profile.findFirst({
        where: { companyId: profile.companyId, pin: pin }
    });

    if (!unlocker) {
        return { success: false, error: "Invalid PIN" };
    }

    // Get the highest priority terminal, or default one
    const terminal = await prisma.posTerminalInfo.findFirst({
        where: { companyId: profile.companyId }
    });

    if (!terminal) {
        return { success: false, error: "No POS terminal found for company" };
    }

    // If it's already active by someone else, return error or handle override
    if (terminal.isActive) {
        // Enforce single session, but maybe we can override if it's the same person
        const activeSession = await prisma.posSession.findFirst({
            where: { posTerminalId: terminal.id, isActive: true }
        });
        
        if (activeSession && activeSession.profileId !== unlocker.id) {
            return { success: false, error: "Terminal is currently in use by another session." };
        }
    }

    // Terminate old sessions for this terminal
    await prisma.posSession.updateMany({
        where: { posTerminalId: terminal.id, isActive: true },
        data: { isActive: false, logoutTime: new Date() }
    });

    // Create new session
    const session = await prisma.posSession.create({
        data: {
            posTerminalId: terminal.id,
            profileId: unlocker.id,
            isActive: true
        }
    });

    // Update terminal status
    await prisma.posTerminalInfo.update({
        where: { id: terminal.id },
        data: { isActive: true }
    });

    return { success: true, user: { name: unlocker.fullName, role: unlocker.role }, terminal: { id: terminal.id, name: terminal.posName } };

  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Internal Error" };
  }
}

export async function authorizeManagerAction(pin: string, actionType: string, referenceId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const currentProfile = await prisma.profile.findFirst({
            where: { userId: user.id },
        });

        if (!currentProfile) return { success: false, error: "Profile not found" };

        const manager = await prisma.profile.findFirst({
            where: { companyId: currentProfile.companyId, pin: pin, role: "manager" } // Must be a manager
        });

        if (!manager) {
            return { success: false, error: "Invalid Manager PIN" };
        }

        // Log the approval
        await prisma.approvalLog.create({
            data: {
                managerId: manager.id,
                actionType,
                referenceId
            }
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: "Internal Error" };
    }
}
