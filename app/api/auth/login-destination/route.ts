import { NextResponse } from "next/server";

import { resolveLoginDestination } from "@/lib/auth/login-destination";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const result = await resolveLoginDestination();

  if (!result.ok) {
    const supabase = await createClient();
    await supabase.auth.signOut();

    return NextResponse.json(
      {
        error: "Your account is not active yet. Please contact an admin.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ destination: result.destination });
}
