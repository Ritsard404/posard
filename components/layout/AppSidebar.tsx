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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link className="flex items-center space-x-2 px-2" href="/">
              <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <span className="text-lg font-bold">P</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold tracking-tight text-foreground">POSard</span>
                <span className="truncate text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Business Suite</span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <SidebarMenuItem>
                  <span className="block px-3 py-2 text-sm text-muted-foreground">
                    Loading navigation...
                  </span>
                </SidebarMenuItem>
              ) : fetchError ? (
                <SidebarMenuItem>
                  <span className="block px-3 py-2 text-sm text-destructive">
                    {fetchError}
                  </span>
                </SidebarMenuItem>
              ) : filteredRoutes.length === 0 ? (
                <SidebarMenuItem>
                  <span className="block px-3 py-2 text-sm text-muted-foreground">
                    No accessible items for your role
                  </span>
                </SidebarMenuItem>
              ) : (
                filteredRoutes.map((route) => {
                  const companyId = (params?.companyId as string) || profile?.company_id || "new";
                  const resolvedHref = route.href.replace("[companyId]", companyId);
                  
                  return (
                    <SidebarMenuItem key={route.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === resolvedHref || pathname.startsWith(resolvedHref + "/")}
                        tooltip={route.label}
                      >
                        <Link href={resolvedHref}>
                          <route.icon />
                          <span>{route.label}</span>
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="cursor-default hover:bg-transparent active:bg-transparent"
              tooltip={profile?.full_name ?? profile?.email ?? "User"}
            >
              <Avatar className="size-8 shrink-0 rounded-lg">
                <AvatarImage
                  src={profile?.avatar_url}
                  alt={profile?.full_name ?? "User"}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold rounded-lg border border-primary/20">
                  {getInitials(profile?.full_name, profile?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-sm font-medium leading-tight">
                  {profile?.full_name ?? "Unknown User"}
                </span>
                <span className="truncate text-xs text-muted-foreground leading-tight">
                  {profile?.email}
                </span>
              </div>
              {profile?.role && (
                <Badge
                  variant="secondary"
                  className="ml-auto shrink-0 capitalize text-[10px] px-1.5 py-0"
                >
                  {profile.role}
                </Badge>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <AlertDialog
              open={showLogoutDialog}
              onOpenChange={setShowLogoutDialog}
            >
              <AlertDialogTrigger asChild>
                <SidebarMenuButton tooltip="Sign Out">
                  <LogOut />
                  <span>Log out</span>
                </SidebarMenuButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Are you sure you want to logout?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be signed out of your account and redirected to the
                    sign-in page.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>
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
                    <span className="truncate font-bold text-foreground">POSard</span>
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
