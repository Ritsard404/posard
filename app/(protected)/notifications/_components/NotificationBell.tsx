"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationListDto } from "../_services/_dto/notification.dto";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "../_actions/notification.actions";
import { cn } from "@/lib/utils";

function formatWhen(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationBell({ initialData }: { initialData: NotificationListDto }) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const markOne = (id: string) => {
    setData((current) => ({
      unreadCount: Math.max(
        0,
        current.unreadCount -
          (current.items.find((item) => item.id === id && !item.isRead) ? 1 : 0),
      ),
      items: current.items.map((item) =>
        item.id === id ? { ...item, isRead: true } : item,
      ),
    }));
    startTransition(() => {
      void markNotificationReadAction(id);
    });
  };

  const markAll = () => {
    setData((current) => ({
      unreadCount: 0,
      items: current.items.map((item) => ({ ...item, isRead: true })),
    }));
    startTransition(() => {
      void markAllNotificationsReadAction();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative size-9 shrink-0"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {data.unreadCount > 0 ? (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]">
              {data.unreadCount > 9 ? "9+" : data.unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1rem))] rounded-lg p-1">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending || data.unreadCount === 0}
            onClick={markAll}
            className="h-8 gap-1 px-2 text-xs"
          >
            <CheckCheck className="size-3.5" />
            Read all
          </Button>
        </div>
        <DropdownMenuSeparator />
        {data.items.length === 0 ? (
          <div className="px-3 py-5 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          data.items.map((item) => {
            const content = (
              <div className="min-w-0 flex-1" onClick={() => markOne(item.id)}>
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{item.title}</span>
                  {!item.isRead ? (
                    <span className="size-2 rounded-full bg-primary" />
                  ) : null}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.body}
                </p>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatWhen(item.createdAt)}
                </div>
              </div>
            );

            return (
              <DropdownMenuItem
                key={item.id}
                asChild={Boolean(item.href)}
                className={cn("cursor-pointer items-start gap-2 rounded-md p-2", !item.isRead && "bg-primary/5")}
              >
                {item.href ? (
                  <Link href={item.href}>{content}</Link>
                ) : (
                  <button type="button" className="w-full text-left">
                    {content}
                  </button>
                )}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
