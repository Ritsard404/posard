import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/auth/:path*",
    "/dashboard/:path*",
    "/pos/:path*",
    "/product/:path*",
    "/report/:path*",
    "/reports/:path*",
    "/accounts/:path*",
    "/companies/:path*",
    "/terminals/:path*",
    "/subscriptions/:path*",
    "/approvals/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/debts/:path*",
    "/setup-company/:path*",
    "/unauthorized",
  ],
};
