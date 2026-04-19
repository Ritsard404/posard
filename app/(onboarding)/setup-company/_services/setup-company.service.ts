"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type SetupCompanyInput = {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoImageUrl?: string;
  managerPin: string;
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
        address: data.address,
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
      data: { 
        companyId: company.id,
        pin: data.managerPin,
        role: "manager" // Explicitly mark as manager just in case
      },
    }),
    prisma.posTerminalInfo.create({
      data: {
        companyId: company.id,
        operatedBy: profile.id,
        registeredName: data.name,
        posName: `${data.name} POS 1`,
        minNumber: "",
        accreditationNumber: "",
        ptuNumber: "",
        dateIssued: today,
        validUntil: threeYearsOut,
        address: data.address || null,
        vatTinNumber: "",
        vat: 12,
        discountMax: 20,
        printerName: "",
        isTrainMode: false,
      },
    }),
  ]);

  redirect("/dashboard");
  // return company;
}
