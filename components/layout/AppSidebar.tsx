"use client";

import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { LogOut } from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
import { getNavByRole, isValidUserRole, UserRole } from "@/lib/access-control";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface UserProfile {
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  company_id?: string;
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

// ─────────────────────────────────────────────────────────────────
// Inner component — uses usePathname() and useRouter(), so it must
// live inside a <Suspense> boundary.
// ─────────────────────────────────────────────────────────────────

function AppSidebarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const sessionUser = sessionData?.session?.user;

        if (!sessionUser) {
          router.push("/auth/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role, status, company_id")
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
            role: profileData.role,
            full_name: undefined,
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
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const filteredRoutes = profile ? getNavByRole(profile.role) : [];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    setShowLogoutDialog(false);
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
      <SidebarHeader className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link className="flex items-center gap-3 px-2 group" href="/">
              <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-105 transition-all duration-300">
                <span className="text-xl font-bold tracking-tighter">P</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-heading font-extrabold text-base tracking-tight text-foreground">
                  POSard
                </span>
                <span className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                  Business Suite
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {isLoading ? (
                <div className="space-y-2 px-3 py-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-9 w-full rounded-lg bg-muted/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : fetchError ? (
                <SidebarMenuItem>
                  <span className="block px-3 py-2 text-sm font-medium text-destructive bg-destructive/5 rounded-lg border border-destructive/10">
                    {fetchError}
                  </span>
                </SidebarMenuItem>
              ) : filteredRoutes.length === 0 ? (
                <SidebarMenuItem>
                  <span className="block px-3 py-2 text-sm text-muted-foreground italic">
                    No accessible items...
                  </span>
                </SidebarMenuItem>
              ) : (
                filteredRoutes.map((route) => {
                  const companyId =
                    (params?.companyId as string) ||
                    profile?.company_id ||
                    "new";
                  const resolvedHref = route.href.replace(
                    "[companyId]",
                    companyId,
                  );
                  const isActive =
                    pathname === resolvedHref ||
                    pathname.startsWith(resolvedHref + "/");

                  return (
                    <SidebarMenuItem key={route.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={route.label}
                        className={cn(
                          "h-11 px-3 rounded-xl transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/10 hover:bg-primary/90 hover:text-primary-foreground"
                            : "hover:bg-muted font-medium",
                        )}
                      >
                        <Link
                          href={resolvedHref}
                          className="flex items-center gap-3"
                        >
                          <route.icon
                            className={cn(
                              "size-5",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                          <span className="text-[14px]">{route.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 mt-auto border-t border-border/50">
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <div className="flex items-center gap-3 p-2 rounded-2xl bg-muted/30 border border-muted/50">
              <Avatar className="size-10 shrink-0 rounded-xl shadow-sm ring-2 ring-background">
                <AvatarImage
                  src={profile?.avatar_url}
                  alt={profile?.full_name ?? "User"}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold rounded-xl">
                  {getInitials(profile?.full_name, profile?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <span className="truncate text-sm font-bold text-foreground leading-none mb-1">
                  {profile?.full_name ?? "Anonymous"}
                </span>
                <span className="truncate text-[11px] text-muted-foreground leading-none">
                  {profile?.email}
                </span>
              </div>
              {profile?.role && (
                <Badge
                  variant="secondary"
                  className="shrink-0 capitalize text-[9px] font-bold px-1.5 py-0 bg-primary/5 text-primary border-primary/10"
                >
                  {profile.role}
                </Badge>
              )}
            </div>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <AlertDialog
              open={showLogoutDialog}
              onOpenChange={setShowLogoutDialog}
            >
              <AlertDialogTrigger asChild>
                <SidebarMenuButton
                  tooltip="Sign Out"
                  className="h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-colors"
                >
                  <LogOut className="size-4" />
                  <span className="text-sm font-medium">Log out</span>
                </SidebarMenuButton>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-heading text-xl">
                    Logout of POSard?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm">
                    You'll need to sign back in to access your dashboard.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="rounded-xl border-muted">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20"
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

// ─────────────────────────────────────────────────────────────────
// Public export — wraps the inner component in <Suspense> so
// Next.js 16 doesn't complain about usePathname() at build time.
// ─────────────────────────────────────────────────────────────────

export function AppSidebar() {
  return (
    <Suspense
      fallback={
        <Sidebar collapsible="icon" variant="sidebar" className="border-r">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center space-x-2 px-2">
                  <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
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
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <span className="block px-3 py-2 text-sm text-muted-foreground">
                      Loading...
                    </span>
                  </SidebarMenuItem>
                </SidebarMenu>
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
