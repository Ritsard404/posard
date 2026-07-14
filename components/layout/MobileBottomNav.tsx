"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  getSidebarSections,
  type SidebarNavItem,
} from "@/lib/access-control";
import {
  isMobileAppHrefAllowed,
  type PosardAppMode,
} from "@/lib/mobile-app-mode";
import { useMobileAppMode } from "@/hooks/use-mobile-app-mode";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/components/layout/AppSidebar";

function isActivePath(
  pathname: string,
  searchParams: URLSearchParams,
  href?: string,
) {
  if (!href) return false;

  const [targetPath, targetQuery] = href.split("?");

  if (!(pathname === targetPath || pathname.startsWith(`${targetPath}/`))) {
    return false;
  }

  if (!targetQuery) return true;

  const targetSearchParams = new URLSearchParams(targetQuery);

  for (const [key, value] of targetSearchParams.entries()) {
    const currentValue = searchParams.get(key);
    if (key === "view" && value === "overview") {
      if (currentValue && currentValue !== value) return false;
      continue;
    }

    if (currentValue !== value) return false;
  }

  return true;
}

function flattenItems(items: SidebarNavItem[]): SidebarNavItem[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flattenItems(item.children) : []),
  ]);
}

const mobilePriority = [
  "pos",
  "dashboard",
  "products-inventory",
  "reports",
  "customers",
  "inventory-ledger",
  "help",
];

export function MobileBottomNav({
  initialProfile,
  initialMode = "desktop-browser",
}: {
  initialProfile: UserProfile | null;
  initialMode?: PosardAppMode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const appMode = useMobileAppMode(initialMode);

  const items = useMemo(() => {
    if (!initialProfile) return [];

    const navContext = {
      companyId:
        initialProfile.role === "manager"
          ? initialProfile.company_id ?? null
          : (params?.companyId as string) ||
            initialProfile.company_id ||
            null,
      profileId: initialProfile.id || null,
      posStatus: initialProfile.pos_status ?? "available",
      billingRestricted: initialProfile.billing_restricted ?? false,
    };

    const uniqueItems = new Map<string, SidebarNavItem>();

    getSidebarSections(initialProfile.role, navContext)
      .filter((section) => section.placement !== "footer")
      .flatMap((section) => flattenItems(section.items))
      .filter(
        (item) =>
          item.href &&
          !item.disabled &&
          isMobileAppHrefAllowed(item.href, appMode, initialProfile.role),
      )
      .forEach((item) => {
        const key = item.href ?? item.id;
        if (!uniqueItems.has(key)) {
          uniqueItems.set(key, item);
        }
      });

    return Array.from(uniqueItems.values())
      .sort((a, b) => {
        const aScore =
          (a.priority ? -100 : 0) +
          (mobilePriority.includes(a.id) ? mobilePriority.indexOf(a.id) : 100);
        const bScore =
          (b.priority ? -100 : 0) +
          (mobilePriority.includes(b.id) ? mobilePriority.indexOf(b.id) : 100);

        return aScore - bScore;
      })
      .slice(0, 4);
  }, [appMode, initialProfile, params?.companyId]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    >
      <div
        className="grid min-h-16"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, searchParams, item.href);

          return (
            <Link
              key={item.href ?? item.id}
              href={item.href ?? "/dashboard"}
              prefetch
              className={cn(
                "flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
