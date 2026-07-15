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
    "/customers/:path*",
    "/data-exchange/:path*",
    "/feature-guide/:path*",
    "/help/:path*",
    "/companies/:path*",
    "/terminals/:path*",
    "/subscriptions/:path*",
    "/approvals/:path*",
    "/business-fit/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/debts/:path*",
    "/expenses/:path*",
    "/inventory-ledger/:path*",
    "/kitchen/:path*",
    "/notifications/:path*",
    "/promotions/:path*",
    "/purchase-orders/:path*",
    "/suppliers/:path*",
    "/sync/:path*",
    "/transfers/:path*",
    "/setup-company/:path*",
    "/unauthorized",
  ],
};
