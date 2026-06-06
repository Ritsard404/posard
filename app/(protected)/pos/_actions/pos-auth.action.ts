"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { auditLogService } from "@/lib/services/audit-log.service";
import { notificationService } from "@/app/(protected)/notifications/_services/notification.service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { findProfileByPin } from "@/lib/security/pin";
import { toSafeActionError } from "@/lib/security/safe-action-error";

export async function unlockTerminalAction(pin: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const profile = await prisma.profile.findFirst({
      where: { userId: user.id },
    });

    if (!profile || !profile.companyId) return { success: false, error: "Profile or company not found" };

    const companyId = profile.companyId;

    await enforceRateLimit({
        bucket: "managerPin",
        route: "/pos",
        action: "UNLOCK_TERMINAL_PIN",
        profileId: profile.id,
        userId: profile.id,
        role: profile.role,
        companyId,
    });

    const unlocker = await findProfileByPin({
        companyId,
        pin,
        select: { id: true, fullName: true, role: true, status: true }
    });

    if (!unlocker || unlocker.status !== "active") {
        return { success: false, error: "Invalid PIN" };
    }

    // Get the highest priority terminal, or default one
    const terminal = await prisma.posTerminalInfo.findFirst({
        where: { companyId }
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
    await prisma.posSession.create({
        data: {
            posTerminalId: terminal.id,
            profileId: unlocker.id as string,
            isActive: true
        }
    });

    // Update terminal status
    await prisma.posTerminalInfo.update({
        where: { id: terminal.id },
        data: { isActive: true }
    });

    return { success: true, user: { name: unlocker.fullName as string | null, role: unlocker.role }, terminal: { id: terminal.id, name: terminal.posName } };

  } catch (error) {
    return { success: false, error: toSafeActionError(error, "Unable to unlock the terminal.") };
  }
}

export async function authorizeManagerAction(pin: string, actionType: string, referenceId: string): Promise<{ success: true, manager: { id: string, email: string, name: string } } | { success: false, error: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const currentProfile = await prisma.profile.findFirst({
            where: { userId: user.id },
        });

        if (!currentProfile) return { success: false, error: "Profile not found" };

        await enforceRateLimit({
            bucket: "managerPin",
            route: "/pos",
            action: "MANAGER_APPROVAL_PIN",
            profileId: currentProfile.id,
            userId: currentProfile.id,
            role: currentProfile.role,
            companyId: currentProfile.companyId,
        });

        const manager = await findProfileByPin({
            companyId: currentProfile.companyId!,
            pin,
            roles: ["manager", "admin"],
            select: { id: true, email: true, fullName: true, status: true }
        });

        if (!manager || manager.status !== "active") {
            return { success: false, error: "Invalid Manager PIN" };
        }

        // Log the approval
        await auditLogService.create(prisma, {
            companyId: currentProfile.companyId!,
            actorProfileId: manager.id as string,
            actionType,
            referenceId,
        });
        await notificationService.create({
            profileId: currentProfile.id,
            companyId: currentProfile.companyId,
            category: "APPROVAL",
            type: "sensitive_action_approved",
            title: "Sensitive action approved",
            body: `${(manager.fullName as string | null) || "Manager"} approved ${actionType}.`,
            href: "/pos",
            relatedEntityType: "approval",
            relatedEntityId: referenceId,
        });

        return { 
            success: true, 
            manager: { 
                id: manager.id as string, 
                email: manager.email as string, 
                name: (manager.fullName as string | null) || "Manager" 
            } 
        };
    } catch (error) {
        console.error("Authorization Error:", error);
        return { success: false, error: toSafeActionError(error, "Unable to authorize this manager action.") };
    }
}
