import {
  COMPANY_BILLING_RESTRICTION_MESSAGE,
  getCompanyBillingAccess,
} from "@/lib/billing-access";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { POSTerminalManager } from "./_components/POSTerminalManager";

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return null;
  }

  return prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: { companyId: true },
  });
}

export default async function POSPage() {
  const profile = await getCurrentProfile();

  if (profile?.companyId) {
    const billingAccess = await getCompanyBillingAccess(profile.companyId);

    if (billingAccess.isRestricted) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-3xl border border-amber-300 bg-amber-50 p-8 text-amber-950 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">
              POS Suspended
            </p>
            <h1 className="mt-3 text-3xl font-heading font-extrabold tracking-tight">
              Terminal access is paused
            </h1>
            <p className="mt-3 text-sm leading-6">
              {COMPANY_BILLING_RESTRICTION_MESSAGE}
            </p>
            <p className="mt-3 text-sm text-amber-900/80">
              Suggested restriction set: keep dashboard and billing pages available, but block POS sessions, checkout, and cashier management until billing is restored.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <POSTerminalManager />
    </div>
  );
}
