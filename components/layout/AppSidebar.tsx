"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
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
  isValidUserRole,
  type SidebarNavItem,
  type SidebarNavSection,
  type UserRole,
} from "@/lib/access-control";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  role: UserRole;
  full_name?: string | null;
  avatar_url?: string;
  email?: string;
  company_id?: string | null;
}

function getInitials(name?: string | null, email?: string): string {
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

function isActivePath(pathname: string, href?: string): boolean {
  if (!href) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function sectionHasActiveItem(pathname: string, items: SidebarNavItem[]): boolean {
  return items.some((item) => {
    if (isActivePath(pathname, item.href)) {
      return true;
    }

    return item.children ? sectionHasActiveItem(pathname, item.children) : false;
  });
}

function NavBadge({ children }: { children: string }) {
  return (
    <Badge
      variant="secondary"
      className="shrink-0 rounded-full bg-muted px-2 py-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
    >
      {children}
    </Badge>
  );
}

function SidebarNavLink({
  item,
  pathname,
}: {
  item: SidebarNavItem;
  pathname: string;
}) {
  const isActive = isActivePath(pathname, item.href);

  if (!item.href || item.disabled) {
    return (
      <SidebarMenuButton
        disabled
        tooltip={item.label}
        className="h-11 rounded-xl px-3 text-muted-foreground/70"
      >
        <item.icon className="size-4" />
        <span className="flex-1 text-[14px]">{item.label}</span>
        {item.badge ? <NavBadge>{item.badge}</NavBadge> : null}
      </SidebarMenuButton>
    );
  }

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={item.label}
      className={cn(
        "h-11 rounded-xl px-3 transition-colors",
        isActive
          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          : "font-medium hover:bg-muted",
      )}
    >
      <Link href={item.href} className="flex items-center gap-3">
        <item.icon className="size-4" />
        <span className="flex-1 text-[14px]">{item.label}</span>
        {item.badge ? <NavBadge>{item.badge}</NavBadge> : null}
      </Link>
    </SidebarMenuButton>
  );
}

function SidebarNavSubLink({
  item,
  pathname,
}: {
  item: SidebarNavItem;
  pathname: string;
}) {
  const isActive = isActivePath(pathname, item.href);

  if (!item.href || item.disabled) {
    return (
      <SidebarMenuSubButton asChild={false} isActive={false} className="opacity-70">
        <span className="flex w-full items-center gap-2">
          <item.icon className="size-4" />
          <span className="flex-1">{item.label}</span>
          {item.badge ? <NavBadge>{item.badge}</NavBadge> : null}
        </span>
      </SidebarMenuSubButton>
    );
  }

  return (
    <SidebarMenuSubButton asChild isActive={isActive}>
      <Link href={item.href} className="flex items-center gap-2">
        <item.icon className="size-4" />
        <span className="flex-1">{item.label}</span>
        {item.badge ? <NavBadge>{item.badge}</NavBadge> : null}
      </Link>
    </SidebarMenuSubButton>
  );
}

function AppSidebarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const sessionUser = sessionData?.session?.user;

        if (!sessionUser) {
          router.push("/auth/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, status, company_id, full_name")
          .eq("user_id", sessionUser.id)
          .single();

        if (profileError || !profileData) {
          throw profileError || new Error("User profile not found");
        }

        if (profileData.status === "pending") {
          router.push("/auth/pending");
          return;
        }

        if (profileData.status === "disabled") {
          router.push("/auth/disabled");
          return;
        }

        if (!isValidUserRole(profileData.role)) {
          throw new Error("Invalid role");
        }

        if (isMounted) {
          setProfile({
            id: profileData.id,
            role: profileData.role,
            full_name: profileData.full_name,
            avatar_url: undefined,
            email: sessionUser.email,
            company_id: profileData.company_id,
          });
        }
      } catch (error) {
        if (isMounted) {
          setFetchError(
            error instanceof Error ? error.message : "Failed to load profile",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const navContext = useMemo(
    () => ({
      companyId: (params?.companyId as string) || profile?.company_id || null,
      profileId: profile?.id || null,
    }),
    [params?.companyId, profile?.company_id, profile?.id],
  );

  const sidebarSections = profile
    ? getSidebarSections(profile.role, navContext)
    : [];

  const contentSections = sidebarSections.filter(
    (section) => section.placement !== "footer",
  );
  const footerSections = sidebarSections.filter(
    (section) => section.placement === "footer",
  );

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    setShowLogoutDialog(false);
  };

  const toggleSection = (sectionId: string, defaultOpen: boolean) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !(current[sectionId] ?? defaultOpen),
    }));
  };

  const renderSection = (section: SidebarNavSection) => {
    if (section.variant === "accordion") {
      const hasActiveItem = sectionHasActiveItem(pathname, section.items);
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
                  className="flex h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-medium hover:bg-muted"
                  onClick={() => toggleSection(section.id, hasActiveItem)}
                >
                  <span className="flex items-center gap-3">
                    {section.icon ? <section.icon className="size-4" /> : null}
                    <span>{section.label}</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      isExpanded ? "rotate-180" : "rotate-0",
                    )}
                  />
                </Button>
                {isExpanded ? (
                  <SidebarMenuSub className="mt-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <SidebarNavSubLink item={item} pathname={pathname} />
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
      const hasActiveItem = sectionHasActiveItem(pathname, section.items);

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
                        "h-11 rounded-xl px-3",
                        hasActiveItem
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                          : "font-medium hover:bg-muted",
                      )}
                    >
                      {section.icon ? <section.icon className="size-4" /> : null}
                      <span className="flex-1 text-[14px]">{section.label}</span>
                      <ChevronDown className="size-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 rounded-xl">
                    {section.items.map((item) => {
                      const isActive = isActivePath(pathname, item.href);

                      if (!item.href || item.disabled) {
                        return (
                          <DropdownMenuItem
                            key={item.id}
                            disabled
                            className="rounded-lg"
                          >
                            <item.icon className="size-4" />
                            <span className="flex-1">{item.label}</span>
                            {item.badge ? <NavBadge>{item.badge}</NavBadge> : null}
                          </DropdownMenuItem>
                        );
                      }

                      return (
                        <DropdownMenuItem key={item.id} asChild className="rounded-lg">
                          <Link href={item.href} className="flex items-center gap-2">
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
                <SidebarNavLink item={item} pathname={pathname} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
      <SidebarHeader className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link className="flex items-center gap-3 px-2 group" href="/">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-200 group-hover:scale-105">
                <span className="text-xl font-bold tracking-tighter">P</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate text-base font-extrabold tracking-tight text-foreground">
                  POSard
                </span>
                <span className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Business Suite
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden px-3 pb-3">
        {isLoading ? (
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              <div className="space-y-2 px-1">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div
                    key={item}
                    className="h-11 w-full animate-pulse rounded-xl bg-muted/60"
                  />
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : fetchError ? (
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              <div className="rounded-xl border border-destructive/15 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {fetchError}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : contentSections.length === 0 ? (
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              <div className="px-3 py-2 text-sm italic text-muted-foreground">
                No accessible items.
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            {contentSections.map(renderSection)}
            <SidebarSeparator className="mt-1" />
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="sticky bottom-0 z-10 mt-auto gap-3 border-t border-border/50 bg-sidebar p-4">
        {footerSections.map((section) => (
          <SidebarMenu key={section.id} className="gap-1.5">
            {section.items.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarNavLink item={item} pathname={pathname} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        ))}

        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <div className="flex items-center gap-3 rounded-2xl border border-muted/60 bg-muted/30 p-2">
              <Avatar className="size-10 shrink-0 rounded-xl ring-2 ring-background">
                <AvatarImage
                  src={profile?.avatar_url}
                  alt={profile?.full_name ?? "User"}
                />
                <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-bold text-primary">
                  {getInitials(profile?.full_name, profile?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
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
                  className="shrink-0 rounded-full bg-primary/5 px-1.5 py-0 text-[9px] font-bold capitalize text-primary"
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
                  className="h-10 rounded-xl text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                >
                  <LogOut className="size-4" />
                  <span className="text-sm font-medium">Log out</span>
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

export function AppSidebar() {
  return (
    <Suspense
      fallback={
        <Sidebar collapsible="icon" variant="sidebar" className="border-r">
          <SidebarHeader className="p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-3 px-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                    <span className="text-lg font-bold">P</span>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-bold text-foreground">
                      POSard
                    </span>
                  </div>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarGroup className="px-0">
              <SidebarGroupContent>
                <div className="space-y-2 px-1">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="h-11 w-full animate-pulse rounded-xl bg-muted/60"
                    />
                  ))}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      }
    >
      <AppSidebarInner />
    </Suspense>
  );
}
