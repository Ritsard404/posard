import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("security headers cover protected pages, exports, devices, and print/display flows", () => {
  const nextConfig = read("next.config.ts");
  const posLayout = read("app/(protected)/pos/_components/POSLayout.tsx");
  const printPreview = read("app/(protected)/pos/_services/print-preview.service.ts");

  assert.match(nextConfig, /source:\s*"\/\(\.\*\)"/);
  assert.match(nextConfig, /Content-Security-Policy-Report-Only/);
  assert.match(nextConfig, /Strict-Transport-Security/);
  assert.match(nextConfig, /process\.env\.NODE_ENV === "production"/);
  assert.match(nextConfig, /X-Content-Type-Options[\s\S]*nosniff/);
  assert.match(nextConfig, /Referrer-Policy[\s\S]*strict-origin-when-cross-origin/);
  assert.match(nextConfig, /X-Frame-Options[\s\S]*DENY/);
  assert.match(nextConfig, /frame-ancestors 'none'/);
  assert.match(nextConfig, /script-src[\s\S]*'unsafe-inline'[\s\S]*'unsafe-eval'/);
  assert.match(nextConfig, /img-src[\s\S]*data:[\s\S]*blob:[\s\S]*https:\/\/\*\.supabase\.co/);
  assert.match(nextConfig, /connect-src[\s\S]*https:\/\/\*\.supabase\.co[\s\S]*wss:\/\/\*\.supabase\.co/);
  assert.match(nextConfig, /worker-src 'self' blob:/);
  assert.match(nextConfig, /Permissions-Policy[\s\S]*usb=\(self\)[\s\S]*bluetooth=\(self\)[\s\S]*serial=\(self\)/);

  for (const route of [
    "/reports/export",
    "/data-exchange/backup/export",
    "/data-exchange/product-catalog/export",
  ]) {
    assert.match(nextConfig, new RegExp(`source:\\s*"${route.replaceAll("/", "\\/")}"`));
  }

  assert.match(nextConfig, /Cache-Control[\s\S]*private, no-store, no-cache/);
  assert.match(nextConfig, /Pragma[\s\S]*no-cache/);
  assert.match(nextConfig, /Vary[\s\S]*Accept-Encoding/);
  assert.match(posLayout, /window\.open\(url,\s*"_blank",\s*"noopener,noreferrer"\)/);
  assert.match(printPreview, /window\.open\("",\s*"_blank",\s*"noopener,noreferrer"\)/);
  assert.match(printPreview, /window\.print\(\)/);
});

test("protected layout keeps profile, role, and billing guards before rendering app data", () => {
  const layout = read("app/(protected)/layout.tsx");

  assert.match(layout, /getCurrentProfile/);
  assert.match(layout, /profile\.status !== "active"/);
  assert.match(layout, /redirect\("\/auth\/login"\)/);
  assert.match(layout, /resolveProtectedRouteRedirect/);
  assert.match(layout, /redirect\(routeRedirect\)/);
  assert.match(layout, /getCompanyBillingAccess/);
  assert.match(layout, /isBillingRestrictedRole/);
  assert.match(layout, /isBillingRestrictedRoute/);
  assert.match(layout, /redirect\("\/dashboard\?billing=restricted"\)/);
  assert.match(layout, /billing_restricted/);
});

test("client logout has bounded remote sign-out and always reaches local cleanup", () => {
  const helper = read("lib/auth/client-logout.ts");
  const route = read("app/auth/logout/route.ts");
  const proxy = read("lib/supabase/proxy.ts");
  const sidebar = read("components/layout/AppSidebar.tsx");
  const logoutButton = read("components/logout-button.tsx");

  assert.match(helper, /DEFAULT_SIGN_OUT_TIMEOUT_MS = 5_000/);
  assert.match(helper, /Promise\.race/);
  assert.match(helper, /supabase\.auth\.signOut\(\)/);
  assert.match(helper, /clearProtectedBrowserCaches\(\)/);
  assert.match(route, /SIGN_OUT_TIMEOUT_MS = 1_000/);
  assert.match(route, /NextResponse\.redirect\(new URL\("\/auth\/login"/);
  assert.match(route, /response\.cookies\.set/);
  assert.match(route, /name\?\.startsWith\("sb-"\)/);
  assert.match(route, /Cache-Control[\s\S]*no-store/);
  assert.match(route, /supabase\.auth\.signOut\(\)/);
  assert.match(proxy, /pathname === "\/auth\/logout"/);
  assert.match(proxy, /logAuthTiming\("logout"\)/);
  assert.match(sidebar, /clearClientSessionForLogout/);
  assert.match(logoutButton, /clearClientSessionForLogout/);
  assert.match(sidebar, /window\.location\.assign\("\/auth\/logout"\)/);
  assert.match(logoutButton, /window\.location\.assign\("\/auth\/logout"\)/);
  assert.doesNotMatch(sidebar, /supabase\.auth\.signOut\(\)/);
  assert.doesNotMatch(logoutButton, /supabase\.auth\.signOut\(\)/);
});

test("service worker never stores protected pages, RSC payloads, APIs, reports, or exports", () => {
  const worker = read("worker/index.ts");

  assert.match(worker, /NetworkOnly/);
  assert.match(worker, /StaleWhileRevalidate/);
  assert.doesNotMatch(worker, /NetworkFirst/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /pathname\.startsWith\("\/_next\/data\/"\)/);
  assert.match(worker, /url\.searchParams\.has\("_rsc"\)/);
  assert.match(worker, /"\/data-exchange"/);
  assert.match(worker, /"\/reports"/);
  assert.match(worker, /"\/pos"/);
  assert.match(worker, /handler:\s*new NetworkOnly\(\)/);
  assert.match(worker, /cacheName:\s*"posard-static-assets"/);
  assert.match(worker, /legacyRuntimeCacheNames/);
  assert.match(worker, /"apis"/);
  assert.match(worker, /"others"/);
  assert.match(worker, /"next-data"/);
  assert.match(worker, /"static-data-assets"/);
  assert.match(worker, /POSARD_CLEAR_PROTECTED_CACHES/);
});

test("POS bootstrap uses delta cursors, no-store fetches, payload metrics, and stale fallback", () => {
  const route = read("app/api/sync/bootstrap/route.ts");
  const client = read("app/(protected)/pos/_services/offline-sync.client.ts");
  const offlineDb = read("app/(protected)/pos/_services/offline-db.client.ts");

  assert.match(route, /parseSinceCursor/);
  assert.match(route, /changedSince = parseSinceCursor/);
  assert.match(route, /categoryService\.getCategories\(companyId,\s*\{ changedSince/);
  assert.match(route, /productService\.getProducts\(companyId,\s*\{ changedSince/);
  assert.match(route, /epaymentService\.getEPaymentMethods\(\{ changedSince/);
  assert.match(route, /removedCategories/);
  assert.match(route, /removedProducts/);
  assert.match(route, /mode:\s*changedSince \? "delta" : "snapshot"/);
  assert.match(route, /durationMs/);
  assert.match(route, /payloadBytes/);
  assert.match(route, /staleAfterMinutes/);
  assert.match(route, /sensitiveNoStoreHeaders/);
  assert.match(route, /console\.info\("POS bootstrap metrics"/);
  assert.match(client, /getBootstrapSyncCursor/);
  assert.match(client, /searchParams\.set\("since", syncCursor\)/);
  assert.match(client, /cache:\s*"no-store"/);
  assert.match(client, /timeoutMs:\s*8_000/);
  assert.match(client, /saveOfflineBootstrap/);
  assert.match(client, /getOfflineBootstrapFallback/);
  assert.match(offlineDb, /bootstrap-sync-cursor/);
});

test("dashboard and customer history paths stay bounded and aggregate-heavy", () => {
  const dashboardService = read("app/(protected)/dashboard/_services/dashboard.service.ts");
  const dashboardScreen = read("app/(protected)/dashboard/_components/DashboardScreen.tsx");
  const remainingFeatures = read("app/(protected)/_services/remaining-features.service.ts");

  assert.match(dashboardService, /DASHBOARD_RECENT_LIMIT = 6/);
  assert.match(dashboardService, /DASHBOARD_TOP_PRODUCT_LIMIT = 5/);
  assert.match(dashboardService, /DASHBOARD_LOW_STOCK_SCAN_LIMIT = 50/);
  assert.match(dashboardService, /prisma\.invoice\.groupBy/);
  assert.match(dashboardService, /prisma\.ePayment\.groupBy/);
  assert.match(dashboardService, /prisma\.item\.groupBy/);
  assert.match(dashboardService, /prisma\.customerDebt\.aggregate/);
  assert.match(dashboardService, /take:\s*DASHBOARD_RECENT_LIMIT/);
  assert.match(dashboardService, /take:\s*DASHBOARD_RESTOCK_LIMIT/);
  assert.match(dashboardService, /console\.info\("POSard dashboard aggregate metrics"/);
  assert.match(dashboardScreen, /dynamic\(/);
  assert.match(dashboardScreen, /ssr:\s*false/);
  assert.match(dashboardScreen, /Loading chart/);

  assert.match(remainingFeatures, /CUSTOMER_PAGE_SIZE = 25/);
  assert.match(remainingFeatures, /CUSTOMER_MAX_PAGE_SIZE = 100/);
  assert.match(remainingFeatures, /skip:\s*\(page - 1\) \* pageSize/);
  assert.match(remainingFeatures, /take:\s*pageSize/);
  assert.match(remainingFeatures, /customerId:\s*\{\s*in:\s*customerIds\s*\}/);
  assert.match(remainingFeatures, /Math\.min\(customerIds\.length \* 12,\s*300\)/);
  assert.match(remainingFeatures, /prisma\.customerDebt\.groupBy/);
  assert.match(remainingFeatures, /prisma\.loyaltyTransaction\.groupBy/);
  assert.match(remainingFeatures, /prisma\.invoice\.groupBy/);
});

test("high-volume relation and sync cursor indexes remain declared", () => {
  const schema = read("prisma/schema.prisma");
  const fkIndexMigration = read("prisma/migrations/20260701090000_security_fk_indexes/migration.sql");
  const syncCursorMigration = read("prisma/migrations/20260702103000_sync_cursor_indexes/migration.sql");
  const customerLinkMigration = read("prisma/migrations/20260702104500_invoice_customer_link/migration.sql");

  for (const index of [
    /@@index\(\[permissionKey\]\)/,
    /@@index\(\[invoiceId\]\)/,
    /@@index\(\[purchaseOrderId\]\)/,
    /@@index\(\[productId\]\)/,
    /@@index\(\[branchId\]\)/,
    /@@index\(\[itemId\]\)/,
    /@@index\(\[companyId, updatedAt\]\)/,
    /@@index\(\[customerId, createdAt\]\)/,
  ]) {
    assert.match(schema, index);
  }

  for (const indexName of [
    "role_permission_permission_key_idx",
    "user_permission_override_permission_key_idx",
    "pos_terminal_info_branch_id_idx",
    "receiving_record_purchase_order_id_idx",
    "loyalty_transaction_invoice_id_idx",
    "promotion_redemption_log_product_id_idx",
    "kitchen_ticket_item_id_idx",
  ]) {
    assert.match(fkIndexMigration, new RegExp(indexName));
  }

  for (const indexName of [
    "category_company_id_updated_at_idx",
    "product_company_id_updated_at_idx",
    "modifier_group_company_id_updated_at_idx",
    "stock_lot_company_id_updated_at_idx",
  ]) {
    assert.match(syncCursorMigration, new RegExp(indexName));
  }

  assert.match(customerLinkMigration, /invoice_customer_id_created_at_idx/);
  assert.match(schema, /customerId\s+String\?\s+@map\("customer_id"\)/);
});
