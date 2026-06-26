"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/lib/services/audit-log.service";

const revenueGoalSchema = z.object({
  month: z.coerce.date(),
  targetAmount: z.coerce.number().min(0),
  notes: z.string().trim().max(500).optional(),
});

function firstDayOfMonth(value: Date) {
  const month = new Date(value);
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  return month;
}

export async function upsertRevenueGoalAction(input: unknown) {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.companyId) {
      return { success: false, error: "No company is assigned to this account." };
    }

    if (profile.role !== "manager") {
      return { success: false, error: "Only managers can set revenue goals." };
    }

    const parsed = revenueGoalSchema.parse(input);
    const month = firstDayOfMonth(parsed.month);
    const targetAmount = new Prisma.Decimal(parsed.targetAmount);
    const notes = parsed.notes?.trim() || null;

    await prisma.$transaction(async (tx) => {
      const goal = await tx.revenueGoal.upsert({
        where: {
          uk_revenue_goal_company_month: {
            companyId: profile.companyId!,
            month,
          },
        },
        create: {
          companyId: profile.companyId!,
          month,
          targetAmount,
          notes,
          createdById: profile.id,
        },
        update: {
          targetAmount,
          notes,
          createdById: profile.id,
        },
        select: { id: true },
      });

      await auditLogService.create(tx, {
        companyId: profile.companyId!,
        actorProfileId: profile.id,
        actionType: "REVENUE_GOAL_UPSERTED",
        referenceId: goal.id,
        amount: parsed.targetAmount,
        changes: `Revenue goal ${month.toISOString().slice(0, 7)} set to ${parsed.targetAmount.toFixed(2)}`,
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/reports/revenue-goal");
    revalidatePath("/report");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save revenue goal.",
    };
  }
}
