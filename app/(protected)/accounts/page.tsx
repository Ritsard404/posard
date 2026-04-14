import { redirect } from "next/navigation";
import { AccountsPageClient } from "./_components/AccountsPageClient";
import { accountsAccessService } from "./_services/accounts-access.service";
import { accountsService } from "./_services/accounts.service";

export default async function AccountsPage() {
  let viewer;

  try {
    viewer = await accountsAccessService.getViewer();
  } catch {
    redirect("/dashboard");
  }

  const [initialAccounts, companyOptions, selfAccount] = await Promise.all([
    accountsService.getAccounts(viewer),
    accountsService.getCompanyOptions(viewer),
    accountsService.getOwnAccount(viewer),
  ]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="absolute top-0 -left-10 h-96 w-96 rounded-full bg-accent/5 opacity-50 blur-3xl pointer-events-none" />
      <div className="absolute top-20 -right-10 h-96 w-96 rounded-full bg-emerald-500/5 opacity-50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-40 h-96 w-96 rounded-full bg-indigo-500/5 opacity-50 blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-1">
          <h1 className="text-3xl font-heading font-extrabold tracking-tight">
            Accounts
          </h1>
          <p className="text-muted-foreground font-medium">
            {viewer.role === "admin"
              ? "Approve manager sign-ups and manage manager and cashier accounts."
              : "Manage cashier accounts in your assigned company."}
          </p>
        </div>

        <AccountsPageClient
          viewer={viewer}
          initialAccounts={initialAccounts}
          companyOptions={companyOptions}
          selfAccount={selfAccount}
        />
      </div>
    </div>
  );
}
