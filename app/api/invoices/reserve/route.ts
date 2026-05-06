import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return null;
  }

  return prisma.profile.findFirst({
    where: { userId: data.user.id, status: "active" },
    select: { id: true, companyId: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const requestedCount = Number.parseInt(
      request.nextUrl.searchParams.get("count") ?? "50",
      10,
    );
    const count = Number.isFinite(requestedCount)
      ? Math.min(Math.max(requestedCount, 1), 500)
      : 50;

    const result = await prisma.$queryRaw<
      Array<{ from_num: bigint; to_num: bigint }>
    >`SELECT * FROM reserve_invoice_numbers(${count})`;

    const range = result[0];
    if (!range) {
      throw new Error("No invoice range was reserved.");
    }

    return NextResponse.json({
      success: true,
      data: {
        from: Number(range.from_num),
        to: Number(range.to_num),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to reserve invoice numbers. Please try again.",
      },
      { status: 500 },
    );
  }
}
