"use server";

import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/security/pin";
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
  if (!currentUserId) throw new Error("Authentication required");

  const today = new Date();
  const threeYearsOut = new Date(today);
  threeYearsOut.setFullYear(threeYearsOut.getFullYear() + 3);

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id
      FROM public.profiles
      WHERE user_id = ${currentUserId}::uuid
      FOR UPDATE
    `;
    const profile = await tx.profile.findUnique({
      where: { userId: currentUserId },
      select: { id: true, companyId: true },
    });

    if (!profile) throw new Error("Profile not found");
    if (profile.companyId) throw new Error("Company setup is already complete");

    const company = await tx.company.create({
      data: {
        name: data.name,
        code: data.code,
        email: data.email,
        phone: data.phone,
        address: data.address,
        logoImageUrl: data.logoImageUrl || null,
      },
    });

    await tx.profile.update({
      where: { userId: currentUserId },
      data: {
        companyId: company.id,
        pin: hashPin(data.managerPin),
        role: "manager",
      },
    });
    await tx.posTerminalInfo.create({
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
        vat: 0,
        discountCapType: "amount",
        discountMax: null,
        printerName: "",
        isDefaultTerminal: true,
        isTrainMode: false,
        subscription: {
          create: {
            billingCycle: "monthly",
            status: "active",
            startsAt: today,
            expiresAt: null,
            renewedAt: today,
            autoRenew: false,
            price: 0,
            notes: "Default complimentary terminal subscription",
          },
        },
      },
    });
  });

  redirect("/dashboard");
}
