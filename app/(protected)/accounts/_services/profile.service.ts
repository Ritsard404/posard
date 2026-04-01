import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, UserRole, UserStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ProfileListItem = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  company: {
    id: string | null;
    name: string | null;
  };
};

// ─────────────────────────────────────────────
// Sorting whitelist
// ─────────────────────────────────────────────

const SORTABLE_FIELDS: Record<string, Prisma.ProfileOrderByWithRelationInput> =
  {
    email: { email: "asc" },
    createdAt: { createdAt: "desc" },
    status: { status: "asc" },
    role: { role: "asc" },
  };

// ─────────────────────────────────────────────
// Mapper
// ─────────────────────────────────────────────

function toListItem(
  profile: Prisma.ProfileGetPayload<{
    include: { company: true };
  }>,
): ProfileListItem {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    status: profile.status,
    isActive: profile.status === "active",
    company: profile.company
      ? { id: profile.company.id, name: profile.company.name }
      : { id: null, name: null },
  };
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export const profileService = {
  async findAll(params?: {
    keyword?: string;
    status?: UserStatus;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: "asc" | "desc";
  }): Promise<ProfileListItem[]> {
    if (USE_MOCK) return [];

    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const currentUserId = data.user?.id;

    console.log(
      "Fetching profiles with params:",
      params,
      "Current user ID:",
      currentUserId,
    );

    const orderBy =
      params?.sortBy && SORTABLE_FIELDS[params.sortBy]
        ? { [params.sortBy]: params.direction ?? "desc" }
        : { createdAt: "desc" as const };

    const where: Prisma.ProfileWhereInput = {
      ...(currentUserId && { userId: { not: currentUserId } }),
      ...(params?.status && { status: params.status }),
      ...(params?.keyword && {
        OR: [
          { email: { contains: params.keyword, mode: "insensitive" } },
          { fullName: { contains: params.keyword, mode: "insensitive" } },
        ],
      }),
    };

    const profiles = await prisma.profile.findMany({
      where,
      include: { company: true },
      skip: (params?.page ?? 0) * (params?.size ?? 10),
      take: params?.size ?? 10,
      orderBy,
    });

    return profiles.map(toListItem);
  },

  async findById(id: string): Promise<ProfileListItem | null> {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const currentUserId = data.user?.id;

    const profile = await prisma.profile.findFirst({
      where: {
        id,
        ...(currentUserId && { userId: { not: currentUserId } }),
      },
      include: { company: true },
    });
    if (!profile) return null;
    return toListItem(profile);
  },

  async approve(id: string): Promise<void> {
    await prisma.profile.update({
      where: { id },
      data: { status: "active", approvedAt: new Date() },
    });
  },

  async reject(id: string): Promise<void> {
    await prisma.profile.update({
      where: { id },
      data: { status: "disabled" },
    });
  },

  async activate(id: string): Promise<void> {
    await prisma.profile.update({
      where: { id },
      data: { status: "active" },
    });
  },

  async deactivate(id: string): Promise<void> {
    await prisma.profile.update({
      where: { id },
      data: { status: "disabled" },
    });
  },
};
