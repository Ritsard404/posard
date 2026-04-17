import "server-only";

import { getCurrentProfile } from "@/lib/auth/current-user";

export interface MutationContext {
  profileId: string;
  companyId: string;
}

export const mutationContextService = {
  async getContext(): Promise<MutationContext> {
    const profile = await getCurrentProfile();

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
