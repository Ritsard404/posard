import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return null;
  }

  return prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: { id: true, companyId: true },
  });
}

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const count = Number(searchParams.get("count") ?? "50");
    if (!Number.isInteger(count) || count < 1 || count > 500) {
      return NextResponse.json(
        { success: false, error: "Reservation count must be between 1 and 500." },
        { status: 400 },
      );
    }

    const result = await prisma.$queryRaw<
      Array<{ from_num: bigint | number; to_num: bigint | number }>
    >`SELECT * FROM reserve_invoice_numbers(${count})`;
    const range = result[0];

    if (!range) {
      throw new Error("Reservation did not return an invoice range.");
    }

    return NextResponse.json({
      success: true,
      data: {
        from: Number(range.from_num),
        to: Number(range.to_num),
      },
    });
  } catch (error) {
    console.error("Invoice reservation failed", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to reserve invoice numbers. Please try again.",
      },
      { status: 500 },
    );
  }
}
