export type NotificationCategory =
  | "REGISTRATION"
  | "TERMINAL_REQUEST"
  | "APPROVAL"
  | "SYSTEM"
  | "REPORT";

export interface NotificationDto {
  id: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  href: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationListDto {
  items: NotificationDto[];
  unreadCount: number;
}
