import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Invoice pre-reservation is disabled. Official invoice numbers are assigned during sale sync.",
    },
    { status: 410 },
  );
}
