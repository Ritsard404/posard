"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
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
import { useState, useEffect } from "react";
import { getNavByRole, isValidUserRole, UserRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
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
          .select("role, status")
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
          setRole(profileData.role);
        }
      } catch (error) {
        if (isMounted) {
          setFetchError(
            error instanceof Error ? error.message : "Failed to load role",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const filteredRoutes = role ? getNavByRole(role) : [];

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
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
                  <span className="text-lg font-bold">B</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Baisard</span>
                  <span className="truncate text-xs text-muted-foreground">
                    POS System
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
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
                filteredRoutes.map((route) => (
                  <SidebarMenuItem key={route.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === route.href}
                      tooltip={route.label}
                    >
                      <Link href={route.href}>
                        <route.icon />
                        <span>{route.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <AlertDialog
              open={showLogoutDialog}
              onOpenChange={setShowLogoutDialog}
            >
              <AlertDialogTrigger asChild>
                <SidebarMenuButton tooltip="Sign Out">
                  <LogOut />
                  <span>Sign out</span>
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
