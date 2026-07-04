import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const SIGN_OUT_TIMEOUT_MS = 1_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Sign out timed out."));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

function getSupabaseCookieNames(request: NextRequest) {
  return (request.headers.get("cookie") ?? "")
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name?.startsWith("sb-")));
}

async function signOutAndRedirect(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/auth/login", request.url));

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");

  for (const cookieName of getSupabaseCookieNames(request)) {
    response.cookies.set(cookieName, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
  }

  try {
    const supabase = await createClient();
    await withTimeout(supabase.auth.signOut(), SIGN_OUT_TIMEOUT_MS);
  } catch (error) {
    console.warn("Unable to finish server sign out before logout redirect.", error);
  }

  return response;
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
