import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ReportViewerDto } from "./_dto/report.dto";

export const reportAccessService = {
  getViewer: cache(async (): Promise<ReportViewerDto> => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      throw new Error("Unauthorized");
    }

    const profile = await prisma.profile.findFirst({
      where: {
        userId: data.user.id,
      },
      select: {
        id: true,
        companyId: true,
        role: true,
        fullName: true,
      },
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    return {
      profileId: profile.id,
      companyId: profile.companyId,
      role: profile.role,
      fullName: profile.fullName,
    };
  }),
};
