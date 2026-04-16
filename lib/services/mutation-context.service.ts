import "server-only";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export interface MutationContext {
  profileId: string;
  companyId: string;
}

export const mutationContextService = {
  async getContext(): Promise<MutationContext> {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      throw new Error("You must be signed in to perform this action.");
    }

    const profile = await prisma.profile.findFirst({
      where: { userId: data.user.id },
      select: { id: true, companyId: true },
    });

    if (!profile?.id) {
      throw new Error("No profile found for this account.");
    }

    if (!profile.companyId) {
      throw new Error("No company associated with this account.");
    }

    return {
      profileId: profile.id,
      companyId: profile.companyId,
    };
  },
};
