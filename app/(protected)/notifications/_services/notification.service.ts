import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { mapNotificationToDto } from "./_mappers/notification.mapper";
import type { NotificationListDto } from "./_dto/notification.dto";

interface CreateNotificationInput {
  profileId: string;
  companyId?: string | null;
  category: "REGISTRATION" | "TERMINAL_REQUEST" | "APPROVAL" | "SYSTEM" | "REPORT";
  type: string;
  title: string;
  body: string;
  href?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export const notificationService = {
  async create(input: CreateNotificationInput): Promise<void> {
    await prisma.userNotification.create({
      data: {
        profileId: input.profileId,
        companyId: input.companyId ?? null,
        category: input.category,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        metadata: input.metadata ?? undefined,
        deliveryChannel: "IN_APP",
        deliveryStatus: "sent",
      },
    });
  },

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    await prisma.userNotification.createMany({
      data: inputs.map((input) => ({
        profileId: input.profileId,
        companyId: input.companyId ?? null,
        category: input.category,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        metadata: input.metadata ?? undefined,
        deliveryChannel: "IN_APP",
        deliveryStatus: "sent",
      })),
    });
  },

  async listForCurrentUser(limit = 10): Promise<NotificationListDto> {
    const profile = await getCurrentProfile();

    if (!profile) {
      throw new Error("Unauthorized");
    }

    const [items, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where: { profileId: profile.id },
        select: {
          id: true,
          category: true,
          type: true,
          title: true,
          body: true,
          href: true,
          relatedEntityType: true,
          relatedEntityId: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.userNotification.count({
        where: { profileId: profile.id, readAt: null },
      }),
    ]);

    return {
      items: items.map(mapNotificationToDto),
      unreadCount,
    };
  },

  async markAsReadForCurrentUser(id: string): Promise<void> {
    const profile = await getCurrentProfile();

    if (!profile) {
      throw new Error("Unauthorized");
    }

    await prisma.userNotification.updateMany({
      where: { id, profileId: profile.id },
      data: { readAt: new Date() },
    });
  },

  async markAllAsReadForCurrentUser(): Promise<void> {
    const profile = await getCurrentProfile();

    if (!profile) {
      throw new Error("Unauthorized");
    }

    await prisma.userNotification.updateMany({
      where: { profileId: profile.id, readAt: null },
      data: { readAt: new Date() },
    });
  },
};
