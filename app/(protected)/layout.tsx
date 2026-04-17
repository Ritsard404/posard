import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { PageTitle } from "@/components/layout/PageTitle";
import { getCurrentProfile } from "@/lib/auth/current-user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

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
              }
            : null
        }
      />
      <SidebarInset>
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 lg:px-6 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-bold truncate text-foreground">
              <PageTitle />
            </h1>
          </div>

          {/* This ID is where we can inject page-specific buttons */}
          <div id="header-actions" className="flex items-center gap-2">
            {/* Pages will teleport their buttons here */}
            <ThemeSwitcher />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
