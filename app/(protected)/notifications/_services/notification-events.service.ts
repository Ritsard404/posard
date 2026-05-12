import "server-only";

import { prisma } from "@/lib/prisma";
import { notificationService } from "./notification.service";

interface PublishOperationalEventInput {
  companyId: string;
  category: "APPROVAL" | "SYSTEM" | "REPORT" | "TERMINAL_REQUEST";
  type: string;
  title: string;
  body: string;
  href?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  roles?: Array<"admin" | "manager" | "cashier">;
  profileIds?: string[];
}

export const notificationEventsService = {
  async publish(input: PublishOperationalEventInput): Promise<void> {
    const roleRecipients = input.roles?.length
      ? await prisma.profile.findMany({
          where: {
            companyId: input.companyId,
            role: { in: input.roles },
            status: "active",
          },
          select: { id: true },
        })
      : [];

    const recipientIds = new Set([
      ...(input.profileIds ?? []),
      ...roleRecipients.map((recipient) => recipient.id),
    ]);

    await notificationService.createMany(
      Array.from(recipientIds).map((profileId) => ({
        profileId,
        companyId: input.companyId,
        category: input.category,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
      })),
    );
  },
};
