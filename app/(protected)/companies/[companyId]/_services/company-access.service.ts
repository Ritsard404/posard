import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type CompanyFeatureRole = "admin" | "manager";

export interface CompanyViewerDTO {
  profileId: string;
  companyId: string | null;
  role: CompanyFeatureRole;
  fullName: string | null;
}

async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await prisma.profile.findFirst({
    where: { userId: user.id },
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

  if (profile.role !== "admin" && profile.role !== "manager") {
    throw new Error("Forbidden");
  }

  return {
    profileId: profile.id,
    companyId: profile.companyId,
    role: profile.role,
    fullName: profile.fullName,
  } satisfies CompanyViewerDTO;
}

export const companyAccessService = {
  async getViewer(): Promise<CompanyViewerDTO> {
    return getCurrentProfile();
  },

  async assertCompanyAccess(targetCompanyId: string): Promise<CompanyViewerDTO> {
    const viewer = await getCurrentProfile();

    if (viewer.role === "admin") {
      return viewer;
    }

    if (!viewer.companyId || viewer.companyId !== targetCompanyId) {
      throw new Error("Forbidden");
    }

    return viewer;
  },

  async assertAdminAccess(targetCompanyId?: string): Promise<CompanyViewerDTO> {
    const viewer = await getCurrentProfile();

    if (viewer.role !== "admin") {
      throw new Error("Forbidden");
    }

    if (targetCompanyId) {
      const company = await prisma.company.findUnique({
        where: { id: targetCompanyId },
        select: { id: true },
      });

      if (!company) {
        throw new Error("Company not found");
      }
    }

    return viewer;
  },
};
