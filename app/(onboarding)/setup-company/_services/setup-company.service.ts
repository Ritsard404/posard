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

  const profile = await prisma.profile.findUnique({
    where: { userId: currentUserId! },
    select: { id: true },
  });

  if (!profile) throw new Error("Profile not found");

  const today = new Date();
  const threeYearsOut = new Date(today);
  threeYearsOut.setFullYear(threeYearsOut.getFullYear() + 3);

  const [company] = await prisma.$transaction([
    prisma.company.create({
      data: {
        name: data.name,
        code: data.code,
        email: data.email,
        phone: data.phone,
        logoImageUrl: data.logoImageUrl,
        users: {
          connect: { userId: currentUserId! },
        },
      },
    }),
  ]);

  // Create default terminal after we have the company id
  await prisma.$transaction([
    prisma.profile.update({
      where: { userId: currentUserId! },
      data: { companyId: company.id },
    }),
    prisma.posTerminalInfo.create({
      data: {
        companyId: company.id,
        operatedBy: profile.id,
        registeredName: data.name,
        posName: `${data.name} - Default Terminal`,
        minNumber: "",
        accreditationNumber: "",
        ptuNumber: "",
        dateIssued: today,
        validUntil: threeYearsOut,
        address: "",
        vatTinNumber: "",
        vat: 12,
        discountMax: 20,
        costCenter: "",
        branchCenter: "",
        useCenter: "",
        printerName: "",
        isTrainMode: false,
        isRetailType: false,
      },
    }),
  ]);

  return company;
}
