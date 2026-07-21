import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const getCurrentAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user ?? null;
});

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentAuthUser();

  if (!user) {
    return null;
  }

  return prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      role: true,
      status: true,
      companyId: true,
      branchId: true,
      fullName: true,
      email: true,
    },
  });
});
