"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notificationService } from "../_services/notification.service";

const IdSchema = z.string().uuid();

export async function markNotificationReadAction(id: string) {
  try {
    const validated = IdSchema.parse(id);
    await notificationService.markAsReadForCurrentUser(validated);
    revalidatePath("/");
    return { success: true } as const;
  } catch (error) {
    console.error(error);
    return { success: false, error: "Unable to update notification." } as const;
  }
}

export async function markAllNotificationsReadAction() {
  try {
    await notificationService.markAllAsReadForCurrentUser();
    revalidatePath("/");
    return { success: true } as const;
  } catch (error) {
    console.error(error);
    return { success: false, error: "Unable to update notifications." } as const;
  }
}
