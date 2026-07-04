"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getSidebarSections,
  type SidebarNavItem,
  type SidebarNavSection,
  type UserRole,
} from "@/lib/access-control";
import {
  isMobileAppHrefAllowed,
  type PosardAppMode,
} from "@/lib/mobile-app-mode";
import { useMobileAppMode } from "@/hooks/use-mobile-app-mode";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { clearClientSessionForLogout } from "@/lib/auth/client-logout";
import { cn } from "@/lib/utils";

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  company_id?: string | null;
  pos_status?: "available" | "in_use";
  billing_restricted?: boolean;
  billing_restriction_reason?: string | null;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return email?.[0]?.toUpperCase() ?? "?";
}

function isActivePath(
  pathname: string,
  searchParams: URLSearchParams,
  href?: string,
): boolean {
  if (!href) {
    return false;
  }

  const [targetPath, targetQuery] = href.split("?");

  if (!(pathname === targetPath || pathname.startsWith(`${targetPath}/`))) {
    return false;
  }

  if (!targetQuery) {
    return true;
  }

  const targetSearchParams = new URLSearchParams(targetQuery);

  for (const [key, value] of targetSearchParams.entries()) {
    const currentValue = searchParams.get(key);

    if (key === "view" && value === "overview") {
      if (currentValue && currentValue !== value) {
        return false;
      }

      continue;
    }

    if (currentValue !== value) {
      return false;
    }
  }

  return true;
}

function sectionHasActiveItem(
  pathname: string,
  searchParams: URLSearchParams,
  items: SidebarNavItem[],
): boolean {
  return items.some((item) => {
    if (isActivePath(pathname, searchParams, item.href)) {
      return true;
    }

    return item.children
      ? sectionHasActiveItem(pathname, searchParams, item.children)
      : false;
  });
}

function filterAppModeItems(
  items: SidebarNavItem[],
  appMode: PosardAppMode,
): SidebarNavItem[] {
  const filteredItems: SidebarNavItem[] = [];

  for (const item of items) {
    const children = item.children
      ? filterAppModeItems(item.children, appMode)
      : undefined;
    const hrefAllowed = isMobileAppHrefAllowed(item.href, appMode);

    if (!hrefAllowed && (!children || children.length === 0)) {
      continue;
    }

    filteredItems.push({
      ...item,
      children,
      disabled: item.disabled || !hrefAllowed,
    });
  }

  return filteredItems;
}

function filterAppModeSections(
  sections: SidebarNavSection[],
  appMode: PosardAppMode,
) {
  return sections
    .map((section) => ({
      ...section,
      items: filterAppModeItems(section.items, appMode),
    }))
    .filter((section) => section.items.length > 0);
}

function NavBadge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: SidebarNavItem["badgeTone"];
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "shrink-0 rounded-full px-2 py-0 text-[10px] font-semibold uppercase tracking-wide group-data-[collapsible=icon]:hidden",
        tone === "active"
          ? "bg-background text-primary"
          : tone === "success"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </Badge>
  );
}

function SidebarNavLink({
  item,
  pathname,
  searchParams,
}: {
  item: SidebarNavItem;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  const isActive = isActivePath(pathname, searchParams, item.href);

  if (!item.href || item.disabled) {
    return (
      <SidebarMenuButton
        disabled
        tooltip={item.label}
        className="h-11 justify-start rounded-xl px-3 text-muted-foreground/70 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
      >
        <item.icon className="size-4" />
        <span className="flex-1 text-[14px] group-data-[collapsible=icon]:hidden">
          {item.label}
        </span>
        {item.badge ? <NavBadge tone={item.badgeTone}>{item.badge}</NavBadge> : null}
      </SidebarMenuButton>
    );
  }

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={item.label}
      className={cn(
        "h-11 justify-start rounded-xl px-3 transition-colors group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0",
        isActive
          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          : item.priority
            ? "border border-primary/20 bg-primary/5 font-bold text-primary hover:bg-primary/10"
            : "font-medium hover:bg-muted",
      )}
    >
      <Link
        href={item.href}
        prefetch
        className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
      >
        <item.icon className="size-4" />
        <span className="flex-1 text-[14px] group-data-[collapsible=icon]:hidden">
          {item.label}
        </span>
        {item.badge ? <NavBadge tone={item.badgeTone}>{item.badge}</NavBadge> : null}
      </Link>
    </SidebarMenuButton>
  );
}

function SidebarNavSubLink({
  item,
  pathname,
  searchParams,
}: {
  item: SidebarNavItem;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  const isActive = isActivePath(pathname, searchParams, item.href);

  if (!item.href || item.disabled) {
    return (
      <SidebarMenuSubButton asChild={false} isActive={false} className="opacity-70">
        <span className="flex w-full items-center gap-2">
          <item.icon className="size-4" />
          <span className="flex-1">{item.label}</span>
          {item.badge ? <NavBadge tone={item.badgeTone}>{item.badge}</NavBadge> : null}
        </span>
      </SidebarMenuSubButton>
    );
  }

  return (
    <SidebarMenuSubButton asChild isActive={isActive}>
      <Link href={item.href} prefetch className="flex items-center gap-2">
        <item.icon className="size-4" />
        <span className="flex-1">{item.label}</span>
        {item.badge ? <NavBadge tone={item.badgeTone}>{item.badge}</NavBadge> : null}
      </Link>
    </SidebarMenuSubButton>
  );
}

export function AppSidebar({
  initialProfile,
  initialMode = "desktop-browser",
}: {
  initialProfile: UserProfile | null;
  initialMode?: PosardAppMode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [profile] = useState<UserProfile | null>(initialProfile);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const appMode = useMobileAppMode(initialMode);

  const navContext = useMemo(
    () => ({
      companyId:
        profile?.role === "manager"
          ? profile.company_id ?? null
          : (params?.companyId as string) || profile?.company_id || null,
      profileId: profile?.id || null,
      posStatus: profile?.pos_status ?? "available",
      billingRestricted: profile?.billing_restricted ?? false,
    }),
    [
      params?.companyId,
      profile?.company_id,
      profile?.id,
      profile?.pos_status,
      profile?.role,
      profile?.billing_restricted,
    ],
  );

  const sidebarSections = useMemo(
    () =>
      profile
        ? filterAppModeSections(
            getSidebarSections(profile.role, navContext),
            appMode,
          )
        : [],
    [appMode, navContext, profile],
  );

  const contentSections = sidebarSections.filter(
    (section) => section.placement !== "footer",
  );
  const footerSections = sidebarSections.filter(
    (section) => section.placement === "footer",
  );

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await clearClientSessionForLogout();
    } finally {
      setShowLogoutDialog(false);
      window.location.assign("/auth/logout");
    }
  };

  const toggleSection = (sectionId: string, defaultOpen: boolean) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !(current[sectionId] ?? defaultOpen),
    }));
  };

  const renderSection = (section: SidebarNavSection) => {
    if (section.variant === "accordion") {
      const hasActiveItem = sectionHasActiveItem(pathname, searchParams, section.items);
      const isExpanded = expandedSections[section.id] ?? hasActiveItem;

      return (
        <SidebarGroup key={section.id} className="px-0">
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {section.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              <SidebarMenuItem>
                <Button
                  type="button"
                  variant="ghost"
                  className="mx-auto flex h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-medium hover:bg-muted group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                  onClick={() => toggleSection(section.id, hasActiveItem)}
                >
                  <span className="flex items-center gap-3">
                    {section.icon ? <section.icon className="size-4" /> : null}
                    <span className="group-data-[collapsible=icon]:hidden">
                      {section.label}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform group-data-[collapsible=icon]:hidden",
                      isExpanded ? "rotate-180" : "rotate-0",
                    )}
                  />
                </Button>
                {isExpanded ? (
                  <SidebarMenuSub className="mt-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <SidebarNavSubLink item={item} pathname={pathname} searchParams={searchParams} />
                      </li>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    if (section.variant === "dropdown") {
      const hasActiveItem = sectionHasActiveItem(pathname, searchParams, section.items);

      return (
        <SidebarGroup key={section.id} className="px-0">
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {section.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      tooltip={section.label}
                      isActive={hasActiveItem}
                      className={cn(
                        "h-11 rounded-xl px-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0",
                        hasActiveItem
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                          : "font-medium hover:bg-muted",
                      )}
                    >
                      {section.icon ? <section.icon className="size-4" /> : null}
                      <span className="flex-1 text-[14px] group-data-[collapsible=icon]:hidden">
                        {section.label}
                      </span>
                      <ChevronDown className="size-4 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 rounded-xl">
                    {section.items.map((item) => {
                      const isActive = isActivePath(pathname, searchParams, item.href);

                      if (!item.href || item.disabled) {
                        return (
                          <DropdownMenuItem
                            key={item.id}
                            disabled
                            className="rounded-lg"
                          >
                            <item.icon className="size-4" />
                            <span className="flex-1">{item.label}</span>
                            {item.badge ? (
                              <NavBadge tone={item.badgeTone}>{item.badge}</NavBadge>
                            ) : null}
                          </DropdownMenuItem>
                        );
                      }

                      return (
                        <DropdownMenuItem key={item.id} asChild className="rounded-lg">
                          <Link href={item.href} prefetch className="flex items-center gap-2">
                            <item.icon className="size-4" />
                            <span className="flex-1">{item.label}</span>
                            {isActive ? <NavBadge>Open</NavBadge> : null}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    return (
      <SidebarGroup key={section.id} className="px-0">
        <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {section.label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1.5">
            {section.items.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarNavLink item={item} pathname={pathname} searchParams={searchParams} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              className="group flex items-center gap-3 px-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              href="/"
              prefetch
            >
              <BrandLogo
                compact
                showSubtitle
                subtitle="Business Suite"
                className="transition-transform duration-200 group-hover:scale-[1.02] group-data-[collapsible=icon]:gap-0"
                markClassName="group-data-[collapsible=icon]:size-8"
                titleClassName="group-data-[collapsible=icon]:hidden"
                subtitleClassName="group-data-[collapsible=icon]:hidden"
              />
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden px-3 pb-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        {contentSections.length === 0 ? (
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              <div className="px-3 py-2 text-sm italic text-muted-foreground">
                No accessible items.
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            {profile?.billing_restricted ? (
              <SidebarGroup className="px-0">
                <SidebarGroupContent>
                  <div className="mx-3 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-950 group-data-[collapsible=icon]:hidden">
                    <div className="font-bold uppercase tracking-[0.16em] text-amber-700">
                      Billing Suspended
                    </div>
                    <div className="mt-1 leading-5">
                      {profile.billing_restriction_reason ??
                        "POS access is paused until billing is restored."}
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
            {contentSections.map(renderSection)}
            <SidebarSeparator className="mt-1" />
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="sticky bottom-0 z-10 mt-auto gap-3 border-t border-border/50 bg-sidebar p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
        {footerSections.map((section) => (
          <SidebarMenu key={section.id} className="gap-1.5">
            {section.items.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarNavLink item={item} pathname={pathname} searchParams={searchParams} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        ))}

        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <div className="flex items-center gap-3 rounded-2xl border border-muted/60 bg-muted/30 p-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
              <Avatar className="size-10 shrink-0 rounded-xl ring-2 ring-background group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg">
                <AvatarImage
                  src={profile?.avatar_url ?? undefined}
                  alt={profile?.full_name ?? "User"}
                />
                <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-bold text-primary">
                  {getInitials(profile?.full_name, profile?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <div className="truncate text-sm font-bold leading-none text-foreground">
                  {profile?.full_name ?? "Anonymous"}
                </div>
                <div className="mt-1 truncate text-[11px] leading-none text-muted-foreground">
                  {profile?.email}
                </div>
              </div>
              {profile?.role ? (
                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-full bg-primary/5 px-1.5 py-0 text-[9px] font-bold capitalize text-primary group-data-[collapsible=icon]:hidden"
                >
                  {profile.role}
                </Badge>
              ) : null}
            </div>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <AlertDialog
              open={showLogoutDialog}
              onOpenChange={setShowLogoutDialog}
            >
              <AlertDialogTrigger asChild>
                <SidebarMenuButton
                  tooltip="Log out"
                  disabled={isLoggingOut}
                  className="h-10 rounded-xl text-muted-foreground hover:bg-destructive/5 hover:text-destructive group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                >
                  <LogOut className="size-4" />
                  <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
                    {isLoggingOut ? "Logging out..." : "Log out"}
                  </span>
                </SidebarMenuButton>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl">
                    Logout of POSard?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm">
                    You&apos;ll need to sign back in to access your dashboard.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="rounded-xl border-muted">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Logout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
