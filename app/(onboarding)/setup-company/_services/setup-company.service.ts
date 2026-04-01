"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type SetupCompanyInput = {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  logoImageUrl?: string;
};

export async function createCompany(data: SetupCompanyInput) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id;

  const company = await prisma.company.create({
    data: {
      name: data.name,
      code: data.code,
      email: data.email,
      phone: data.phone,
      logoImageUrl: data.logoImageUrl,
    },
  });

  await prisma.profile.update({
    where: { userId: currentUserId! },
    data: { companyId: company.id },
  });

  return company;
}
