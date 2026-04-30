import "server-only";

import { getCompanyBillingAccess } from "@/lib/billing-access";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { AccountsViewerDto } from "./_dto/accounts.dto";

async function getCurrentProfile(): Promise<AccountsViewerDto> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      userId: true,
      companyId: true,
      role: true,
      fullName: true,
      email: true,
    },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  const billingAccess =
    profile.role === "manager" && profile.companyId
      ? await getCompanyBillingAccess(profile.companyId)
      : null;

  return {
    profileId: profile.id,
    userId: profile.userId,
    companyId: profile.companyId,
    role: profile.role,
    fullName: profile.fullName,
    email: profile.email,
    billingRestricted: billingAccess?.isRestricted ?? false,
    billingRestrictionReason: billingAccess?.reason ?? null,
  };
}

export const accountsAccessService = {
  async getViewer(): Promise<AccountsViewerDto> {
    const profile = await getCurrentProfile();

    if (profile.role !== "admin" && profile.role !== "manager") {
      throw new Error("Forbidden");
    }

    return profile;
  },

  async getProfileViewer(): Promise<AccountsViewerDto> {
    return getCurrentProfile();
  },
};
