import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import type { UserProfile } from "@/components/layout/AppSidebar";
import { MobileAppModeBridge } from "@/components/layout/MobileAppModeBridge";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MobileRestrictedFeature } from "@/components/layout/MobileRestrictedFeature";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { PageTitle } from "@/components/layout/PageTitle";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { getCompanyBillingAccess } from "@/lib/billing-access";
import { NotificationBell } from "./notifications/_components/NotificationBell";
import type { NotificationListDto } from "./notifications/_services/_dto/notification.dto";
import { notificationService } from "./notifications/_services/notification.service";
import {
  isBillingRestrictedRole,
  isBillingRestrictedRoute,
  resolveProtectedRouteRedirect,
} from "@/lib/access-control-core";
import {
  getMobileAppRouteRestriction,
  isRestrictedMobileAppMode,
  normalizePosardAppMode,
} from "@/lib/mobile-app-mode";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logAuthTiming = (data: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("POSard protected auth timing", data);
    }
  };
  const headerStore = await headers();
  const pathname = headerStore.get("x-posard-pathname") ?? "/dashboard";
  const search = headerStore.get("x-posard-search") ?? "";
  const appMode =
    normalizePosardAppMode(headerStore.get("x-posard-app-mode")) ??
    "desktop-browser";
  const isAppMode = isRestrictedMobileAppMode(appMode);
  const isPosRoute = pathname === "/pos" || pathname.startsWith("/pos/");
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    logAuthTiming({
      pathname,
      reason: "inactive-or-missing-profile",
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
    });
    redirect(routeRedirect);
  }

  const buildInitialProfile = (
    posStatus: UserProfile["pos_status"] = "available",
    billingAccess?: Awaited<ReturnType<typeof getCompanyBillingAccess>> | null,
  ): UserProfile => ({
    id: profile.id,
    role: profile.role,
    full_name: profile.fullName,
    email: profile.email,
    company_id: profile.companyId,
    pos_status: posStatus,
    billing_restricted: billingAccess?.isRestricted ?? false,
    billing_restriction_reason: billingAccess?.reason ?? null,
  });

  const renderShell = (
    content: React.ReactNode,
    initialProfile: UserProfile,
    notifications: NotificationListDto,
  ) => (
    <SidebarProvider>
      <MobileAppModeBridge initialMode={appMode} role={initialProfile.role} />
      <AppSidebar initialProfile={initialProfile} initialMode={appMode} />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/80 px-3 backdrop-blur-md lg:px-4">
          <div className="flex min-w-0 shrink items-center gap-2">
            <SidebarTrigger className={isAppMode ? "hidden md:inline-flex" : "-ml-1"} />
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
            {!isPosRoute && !isAppMode ? (
              <PwaInstallButton
                label="Install"
                size="sm"
                variant="ghost"
                showFallback={false}
                className="shrink-0"
              />
            ) : null}
            {!isAppMode ? <ThemeSwitcher /> : null}
            <NotificationBell initialData={notifications} />
          </div>
        </header>

        {/* Main content */}
        <main
          className={`min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2 lg:p-3 ${isPosRoute ? "" : "pb-20 md:pb-3"}`}
        >
          {content}
        </main>
        {!isPosRoute ? (
          <MobileBottomNav initialProfile={initialProfile} initialMode={appMode} />
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );

  const mobileRestriction = getMobileAppRouteRestriction({
    pathname,
    search,
    mode: appMode,
    role: profile.role,
  });

  if (mobileRestriction.restricted) {
    const emptyNotifications = {
      unreadCount: 0,
      items: [],
    } satisfies NotificationListDto;

    logAuthTiming({
      pathname,
      reason: "mobile-app-restricted",
      appMode,
    });

    return renderShell(
      <MobileRestrictedFeature
        title={mobileRestriction.title}
        reason={mobileRestriction.reason}
        mode={appMode}
        companyId={profile.companyId}
      />,
      buildInitialProfile(),
      emptyNotifications,
    );
  }

  const [activePosSession, billingAccess, notifications] = await Promise.all([
    prisma.timestamp.findFirst({
      where: {
        cashierId: profile.id,
        timestampOut: null,
      },
      select: { id: true },
    }),
    profile.companyId &&
    (profile.role === "manager" || profile.role === "cashier")
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
    });
    redirect("/dashboard?billing=restricted");
  }

  logAuthTiming({
    pathname,
    reason: "authorized",
  });

  return renderShell(
    children,
    buildInitialProfile(activePosSession ? "in_use" : "available", billingAccess),
    notifications,
  );
}
