import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

function getSafeNext(searchParams: URLSearchParams) {
  const next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNext(searchParams);

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id && user.email) {
        try {
          await prisma.profile.updateMany({
            where: { userId: user.id },
            data: { email: user.email },
          });
        } catch (profileSyncError) {
          console.error("Failed to sync confirmed auth email", profileSyncError);
        }
      }

      redirect(next);
    } else {
      redirect(`/auth/error?error=${error?.message}`);
    }
  }

  redirect(`/auth/error?error=No token hash or type`);
}
