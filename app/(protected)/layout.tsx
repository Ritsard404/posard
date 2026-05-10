import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { PageTitle } from "@/components/layout/PageTitle";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { getCompanyBillingAccess } from "@/lib/billing-access";
import { NotificationBell } from "./notifications/_components/NotificationBell";
import { notificationService } from "./notifications/_services/notification.service";
import {
  isBillingRestrictedRole,
  isBillingRestrictedRoute,
  resolveProtectedRouteRedirect,
} from "@/lib/access-control-core";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const startedAt = performance.now();
  const logAuthTiming = (data: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("POSard protected auth timing", data);
    }
  };
  const headerStore = await headers();
  const pathname = headerStore.get("x-posard-pathname") ?? "/dashboard";
  const isPosRoute = pathname === "/pos" || pathname.startsWith("/pos/");
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    logAuthTiming({
      pathname,
      reason: "inactive-or-missing-profile",
      ms: Math.round(performance.now() - startedAt),
    });
    redirect("/auth/login");
  }

  if (
    profile.role === "manager" &&
    !profile.companyId &&
    !pathname.startsWith("/setup-company")
  ) {
    logAuthTiming({
      pathname,
      reason: "manager-company-setup-required",
      ms: Math.round(performance.now() - startedAt),
    });
    redirect("/setup-company");
  }

  const routeRedirect = resolveProtectedRouteRedirect({
    role: profile.role,
    pathname,
  });

  if (routeRedirect) {
    logAuthTiming({
      pathname,
      reason: "route-forbidden",
      destination: routeRedirect,
      ms: Math.round(performance.now() - startedAt),
    });
    redirect(routeRedirect);
  }

  const [activePosSession, billingAccess, notifications] = await Promise.all([
    prisma.timestamp.findFirst({
        where: {
          cashierId: profile.id,
          timestampOut: null,
        },
        select: { id: true },
      }),
    profile.companyId && (profile.role === "manager" || profile.role === "cashier")
      ? getCompanyBillingAccess(profile.companyId)
      : Promise.resolve(null),
    notificationService.listForCurrentUser(8),
  ]);

  if (
    billingAccess?.isRestricted &&
    isBillingRestrictedRole(profile.role) &&
    isBillingRestrictedRoute(profile.role, pathname)
  ) {
    logAuthTiming({
      pathname,
      reason: "billing-restricted",
      ms: Math.round(performance.now() - startedAt),
    });
    redirect("/dashboard?billing=restricted");
  }

  logAuthTiming({
    pathname,
    reason: "authorized",
    ms: Math.round(performance.now() - startedAt),
  });

  return (
    <SidebarProvider>
      <AppSidebar
        initialProfile={
          profile
            ? {
                id: profile.id,
                role: profile.role,
                full_name: profile.fullName,
                email: profile.email,
                company_id: profile.companyId,
                pos_status: activePosSession ? "in_use" : "available",
                billing_restricted: billingAccess?.isRestricted ?? false,
                billing_restriction_reason: billingAccess?.reason ?? null,
              }
            : null
        }
      />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/80 px-3 backdrop-blur-md lg:px-4">
          <div className="flex min-w-0 shrink items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="truncate text-lg font-bold text-foreground lg:text-xl">
              <PageTitle />
            </h1>
          </div>

          {/* This ID is where we can inject page-specific buttons */}
          <div
            id="header-actions"
            className="flex min-w-0 flex-1 shrink items-center justify-end gap-1.5 overflow-x-auto"
          >
            {/* Pages will teleport their buttons here */}
            {!isPosRoute ? (
              <PwaInstallButton
                label="Install"
                size="sm"
                variant="ghost"
                showFallback={false}
                className="shrink-0"
              />
            ) : null}
            <ThemeSwitcher />
            <NotificationBell initialData={notifications} />
          </div>
        </header>

        {/* Main content */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2 lg:p-3">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
