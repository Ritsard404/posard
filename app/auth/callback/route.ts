import { NextResponse, type NextRequest } from "next/server";

import { registrationRequestService } from "@/app/auth/_services/registration-request.service";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getSafeNextUrl(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/auth/post-login";
  }

  return next;
}

function getUserFullName(metadata: Record<string, unknown>) {
  const fullName = metadata.full_name ?? metadata.name;

  return typeof fullName === "string" && fullName.trim().length > 0
    ? fullName.trim()
    : null;
}

function isGoogleSignUpRequest(request: NextRequest) {
  return request.nextUrl.searchParams.get("mode") === "signup";
}

async function removeTemporaryOAuthUser(userId: string) {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Failed to remove temporary Google OAuth user", error);
    }
  } catch (error) {
    console.error("Failed to create Supabase admin client for OAuth cleanup", error);
  }
}

async function submitPendingGoogleRegistration(input: {
  request: NextRequest;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string;
  fullName: string | null;
}) {
  await input.supabase.auth.signOut();

  try {
    await registrationRequestService.submitGoogleOAuthRequest({
      fullName: input.fullName ?? input.email,
      email: input.email,
    });
    await removeTemporaryOAuthUser(input.userId);

    return NextResponse.redirect(
      new URL("/auth/sign-up-success", input.request.url),
    );
  } catch (error) {
    console.error("Google registration request failed", error);
    await removeTemporaryOAuthUser(input.userId);

    return NextResponse.redirect(new URL("/auth/sign-up", input.request.url));
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextUrl(request);

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Supabase OAuth callback failed", exchangeError);
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    console.error("Supabase OAuth user lookup failed", userError);
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const fullName = getUserFullName(user.user_metadata);

  if (isGoogleSignUpRequest(request)) {
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    const existingEmailProfile = existingProfile
      ? null
      : await prisma.profile.findUnique({
          where: { email: user.email },
          select: { id: true },
        });

    if (existingProfile || existingEmailProfile) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    return submitPendingGoogleRegistration({
      request,
      supabase,
      userId: user.id,
      email: user.email,
      fullName,
    });
  }

  const existingProfile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { id: true, fullName: true },
  });

  if (!existingProfile) {
    const existingEmailProfile = await prisma.profile.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    if (existingEmailProfile) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    return submitPendingGoogleRegistration({
      request,
      supabase,
      userId: user.id,
      email: user.email,
      fullName,
    });
  } else if (!existingProfile.fullName && fullName) {
    await prisma.profile.update({
      where: { id: existingProfile.id },
      data: { fullName },
    });
  }

  return NextResponse.redirect(new URL(next, request.url));
}
