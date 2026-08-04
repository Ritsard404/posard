"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { auditLogService } from "@/lib/services/audit-log.service";
import { toSafeActionError } from "@/lib/security/safe-action-error";

const customerUpdateSchema = z.object({
  idempotencyKey: z.string().uuid(),
  customerId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(80).optional().default(""),
});

const loyaltyMutationSchema = z.object({
  idempotencyKey: z.string().uuid(),
  customerId: z.string().uuid(),
  transactionType: z.enum(["earn", "redeem"]),
  points: z.coerce.number().int().positive().max(1_000_000),
  reason: z.string().trim().min(1).max(240),
});

async function requireManager() {
  const profile = await getCurrentProfile();
  if (!profile?.companyId || !["admin", "manager"].includes(profile.role)) {
    throw new Error("Manager access is required.");
  }
  return { ...profile, companyId: profile.companyId };
}

function objectPayload(payload: unknown) {
  return payload instanceof FormData ? Object.fromEntries(payload.entries()) : payload;
}

export async function updateCustomerAction(payload: unknown) {
  try {
    const input = customerUpdateSchema.parse(objectPayload(payload));
    const viewer = await requireManager();
    await prisma.$transaction(async (tx) => {
      const request = await tx.workflowMutationRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (request) {
        if (request.companyId !== viewer.companyId) throw new Error("Customer mutation does not belong to this company.");
        return;
      }
      await tx.workflowMutationRequest.create({ data: {
        idempotencyKey: input.idempotencyKey,
        companyId: viewer.companyId,
        entityType: "customer",
        entityId: input.customerId,
        action: "update",
      } });
      const customer = await tx.customer.updateMany({
        where: { id: input.customerId, companyId: viewer.companyId },
        data: { name: input.name, phone: input.phone || null },
      });
      if (customer.count !== 1) throw new Error("Customer was not found in this company.");
      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.id,
        actionType: "CUSTOMER_UPDATED",
        referenceId: input.customerId,
        changes: JSON.stringify({ name: input.name, phone: input.phone || null }),
      });
    });
    return;
  } catch (error) {
    throw new Error(toSafeActionError(error, "Unable to update customer."));
  }
}

export async function recordLoyaltyMutationAction(payload: unknown) {
  try {
    const input = loyaltyMutationSchema.parse(objectPayload(payload));
    const viewer = await requireManager();
    const delta = input.transactionType === "earn" ? input.points : -input.points;
    await prisma.$transaction(async (tx) => {
      const request = await tx.workflowMutationRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (request) {
        if (request.companyId !== viewer.companyId) throw new Error("Loyalty mutation does not belong to this company.");
        return;
      }
      await tx.$queryRaw`SELECT id FROM public.customer WHERE id = ${input.customerId}::uuid AND company_id = ${viewer.companyId}::uuid FOR UPDATE`;
      const customer = await tx.customer.findFirst({ where: { id: input.customerId, companyId: viewer.companyId }, select: { id: true } });
      if (!customer) throw new Error("Customer was not found in this company.");
      const balance = await tx.loyaltyTransaction.aggregate({ where: { companyId: viewer.companyId, customerId: input.customerId }, _sum: { pointsDelta: true } });
      if (Number(balance._sum?.pointsDelta ?? 0) + delta < 0) throw new Error("Loyalty balance cannot become negative.");
      await tx.workflowMutationRequest.create({ data: {
        idempotencyKey: input.idempotencyKey,
        companyId: viewer.companyId,
        entityType: "customer_loyalty",
        entityId: input.customerId,
        action: input.transactionType,
      } });
      await tx.loyaltyTransaction.create({
        data: {
          companyId: viewer.companyId,
          customerId: input.customerId,
          createdById: viewer.id,
          transactionType: input.transactionType,
          pointsDelta: delta,
          reason: input.reason,
        },
      });
      await auditLogService.create(tx, {
        companyId: viewer.companyId,
        actorProfileId: viewer.id,
        actionType: `LOYALTY_${input.transactionType.toUpperCase()}`,
        referenceId: input.customerId,
        changes: JSON.stringify({ pointsDelta: delta, reason: input.reason }),
      });
    });
    return;
  } catch (error) {
    throw new Error(toSafeActionError(error, "Unable to update loyalty."));
  }
}
