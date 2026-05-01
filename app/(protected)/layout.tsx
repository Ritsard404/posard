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
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  const activePosSession = profile
    ? await prisma.timestamp.findFirst({
        where: {
          cashierId: profile.id,
          timestampOut: null,
        },
        select: { id: true },
      })
    : null;
  const billingAccess =
    profile?.companyId && (profile.role === "manager" || profile.role === "cashier")
      ? await getCompanyBillingAccess(profile.companyId)
      : null;

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
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <h1 className="truncate text-lg font-bold text-foreground lg:text-xl">
              <PageTitle />
            </h1>
          </div>

          {/* This ID is where we can inject page-specific buttons */}
          <div id="header-actions" className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 overflow-hidden">
            {/* Pages will teleport their buttons here */}
            <PwaInstallButton
              label="Install"
              size="sm"
              variant="ghost"
              showFallback={false}
              className="max-w-[6.5rem]"
            />
            <ThemeSwitcher />
          </div>
        </header>

        {/* Main content */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2 lg:p-3">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
