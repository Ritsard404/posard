import type { NotificationDto } from "../_dto/notification.dto";

export function mapNotificationToDto(input: {
  id: string;
  category: NotificationDto["category"];
  type: string;
  title: string;
  body: string;
  href: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationDto {
  return {
    id: input.id,
    category: input.category,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    isRead: Boolean(input.readAt),
    createdAt: input.createdAt,
  };
}
