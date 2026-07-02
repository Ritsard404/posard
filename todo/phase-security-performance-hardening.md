# Phase Security and Performance Hardening TODO

Audit date: 2026-06-30

Scope: POSard application security, dependency risk, protected route coverage, service-worker caching, rate limiting, database defense in depth, indexes, export safety, and high-volume performance paths.

## Audit Baseline

- `npx.cmd prisma validate` passed.
- `npx.cmd prisma migrate status` passed; database schema is up to date with 45 migrations.
- `npx.cmd tsc --noEmit` passed.
- `npm.cmd audit --omit=dev --json` found 17 production dependency vulnerabilities: 10 high, 6 moderate, 1 low.
- Live RLS check found RLS enabled only on `profiles`, `registration_requests`, and `customer_display_state`.
- Live grant check found only narrow browser grants to `anon` and `authenticated`, so the current RLS gap is mainly defense in depth unless future grants expand.

## Highest Risk Findings

- Production dependencies include vulnerable packages: `next@16.2.1`, `xlsx@0.18.5`, `next-pwa@5.6.0` and Workbox/`serialize-javascript`, plus transitive `hono`, `fast-uri`, `ws`, `postcss`, `tar`, and `brace-expansion`.
- `package.json` uses drift-prone `"latest"` ranges for core runtime packages, including `next`, `@supabase/ssr`, and `@supabase/supabase-js`.
- Several protected route groups are missing from `proxy.ts` matcher coverage, which can cause inconsistent unauthenticated behavior and has caused protected-route failures before.
- The generated Workbox service worker caches same-origin API GETs and non-API pages broadly, which risks keeping protected POS data in browser Cache Storage on shared devices.
- Rate limiting uses an in-memory store, so limits are per instance and reset on restarts in deployed/serverless environments.
- Data export routes for backup and product catalog rely on service-level auth, but lack route-level rate limiting, sanitized error handling, no-store headers, and download auditing.
- `is_admin(auth.uid())` is a `SECURITY DEFINER` function without an explicit `search_path`, and RLS policies call auth helpers directly instead of using optimized `select auth.uid()` patterns.
- Several foreign-key columns lack direct index coverage and can slow deletes, cascades, joins, and integrity checks.
- Large dashboard, POS bootstrap, customer, and backup export paths load broad datasets into memory instead of using incremental sync, streaming, pagination, or database aggregation.

## Phase 0 - Dependency Containment

Priority: Critical

- [x] Replace `"latest"` dependency ranges with pinned compatible versions for production packages.
- [x] Upgrade `next` from `16.2.1` to the audit-recommended patched version or the latest compatible patched 16.x release, then rerun audit, typecheck, and build.
- [x] Align `eslint-config-next` with the installed Next major version.
- [x] Resolve the `next-pwa` / Workbox / `serialize-javascript` vulnerability chain.
  - [x] Prefer replacing or reconfiguring the PWA layer instead of accepting the audit-suggested downgrade path blindly.
  - [x] If a safe replacement is not immediately available, temporarily disable generated Workbox runtime caching for protected app surfaces.
- [x] Replace or isolate `xlsx@0.18.5`, which has no npm audit fix available.
  - [x] Move workbook parsing out of the main client bundle.
  - [x] Parse imports on the server or lazy-load parser code only after a file is selected.
  - [x] Enforce file size, MIME/type, sheet count, row count, and timeout limits for spreadsheet imports.
- [x] Rerun `npm.cmd audit --omit=dev --json` and record remaining accepted risks with package owner, reason, and planned removal date.

Acceptance checks:

- [x] No vulnerable direct production dependency remains without an explicit documented exception.
- [x] Lockfile is deterministic and does not rely on `"latest"` for core runtime dependencies.
- [x] `npm.cmd audit --omit=dev --json` is clean or has only documented accepted transitive risk.

## Phase 1 - Protected Route Coverage

Priority: Critical

- [x] Add these missing protected route groups to `proxy.ts` matcher coverage:
  - `/customers/:path*`
  - `/data-exchange/:path*`
  - `/expenses/:path*`
  - `/inventory-ledger/:path*`
  - `/kitchen/:path*`
  - `/notifications/:path*`
  - `/promotions/:path*`
  - `/purchase-orders/:path*`
  - `/suppliers/:path*`
  - `/sync/:path*`
  - `/transfers/:path*`
- [x] Add a protected route manifest test that compares `app/(protected)` top-level routes against `proxy.ts` matcher coverage.
- [x] Add unauthenticated redirect coverage for every protected route group.
- [x] Verify that `/feature-guide` keeps the intended signed-in walkthrough behavior.

Acceptance checks:

- [x] Every top-level protected route is covered by the proxy matcher or has a documented reason for exclusion.
- [x] Unauthenticated requests redirect to login before server auth reads protected data.
- [ ] Existing role and billing guards in `app/(protected)/layout.tsx` still work.

## Phase 2 - Security Headers

Priority: Critical

- [x] Add global security headers in `next.config.ts`:
  - `Content-Security-Policy` or `Content-Security-Policy-Report-Only` for initial rollout.
  - `Strict-Transport-Security` in production.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy`.
  - `Permissions-Policy`.
  - `X-Frame-Options` or CSP `frame-ancestors`.
- [x] Add stricter headers for export/download routes:
  - `Cache-Control: no-store`.
  - `Pragma: no-cache`.
  - `X-Content-Type-Options: nosniff`.
- [x] Confirm JSON-LD script rendering still works after CSP changes.
- [ ] Check whether receipt printing, customer display, and any embedded displays need explicit CSP exceptions.

Acceptance checks:

- [ ] Protected pages include expected security headers in local and production-like responses.
- [ ] CSP rollout does not break POS checkout, receipt printing, customer display, or public marketing pages.

## Phase 3 - PWA and Shared Device Data Safety

Priority: Critical

- [x] Reconfigure service-worker runtime caching so protected app pages, RSC payloads, API responses, exports, and reports are not stored in browser Cache Storage.
- [x] Cache only safe static assets and explicit offline POS resources.
- [x] Keep offline POS business data in the existing explicit offline storage path, where purge and sync rules are visible and testable.
- [x] Add logout/session-expiry cleanup that clears protected caches, POS offline state when required, and stale service-worker caches.
- [x] Add a service-worker version migration that deletes older broad Workbox caches such as `apis` and `others`.
- [ ] Add browser verification that a signed-in POS session does not leave protected HTML, RSC payloads, backup exports, or report exports in Cache Storage after logout.

Acceptance checks:

- [ ] Offline POS still works for the intended checkout flow.
- [ ] Protected pages and export responses are not available from Cache Storage after logout.
- [x] Existing generated service-worker artifacts are either regenerated safely or removed from source control if they are build outputs.

## Phase 4 - Rate Limits, Exports, and Abuse Resistance

Priority: High

- [x] Replace the active in-memory rate-limit store with a shared durable store for production.
  - [x] Keep memory store only as a development/test fallback.
  - [x] Use a key model that includes user, company, terminal, and hashed IP where appropriate.
- [x] Add rate limiting to sync bootstrap requests.
- [x] Add route-level rate limiting to data exchange backup and product catalog export routes.
- [x] Add sanitized `try/catch` error handling to export routes so internal errors do not leak implementation details.
- [x] Add export audit logging with actor, company, export type, timestamp, row counts, and file size.
- [x] Add no-store headers to all sensitive exports.
- [x] Add payload size, date range, and row count limits for report and data-exchange exports.

Acceptance checks:

- [x] Login, signup, manager PIN, sync bootstrap, report export, backup export, and product catalog export are protected by durable production rate limits.
- [x] Export failures return safe user-facing errors.
- [x] Managers can inspect export history for their company.

## Phase 5 - Database RLS Defense in Depth

Priority: High

- [x] Harden the `is_admin` function.
  - [x] Set an explicit `search_path`.
  - [x] Fully qualify table references.
  - [x] Keep the function `SECURITY DEFINER` only if still required.
- [x] Optimize RLS policy helper calls by using Supabase-recommended `select auth.uid()` style where applicable.
- [x] Decide the defense-in-depth RLS posture for Prisma-managed business tables.
  - [ ] Option A: enable RLS and add service-role-only policies where browser grants are not needed.
  - [x] Option B: document why RLS remains disabled and add CI checks that prevent accidental browser grants.
- [x] Add a schema/security check that fails if `anon` or `authenticated` receives broad table privileges without matching RLS policies.
- [x] Add migration tests for `profiles`, `registration_requests`, and `customer_display_state` policies.

Acceptance checks:

- [x] `is_admin` is search-path safe.
- [x] Direct browser roles cannot read or mutate business tables unless explicitly intended.
- [x] Future grants cannot silently expose tables with RLS disabled.

## Phase 6 - Missing FK Indexes

Priority: High

Add direct indexes or document why each index is unnecessary:

- [x] `UserPermissionOverride.permissionKey`
- [x] `LoyaltyTransaction.invoiceId`
- [x] `ReceivingRecord.purchaseOrderId`
- [x] `PromotionRedemptionLog.productId`
- [x] `RolePermission.permissionKey`
- [x] `PosTerminalInfo.branchId`
- [x] `KitchenTicket.itemId`

Acceptance checks:

- [x] Prisma migration adds the selected indexes.
- [x] `npx.cmd prisma validate` passes.
- [x] `npx.cmd prisma migrate status` passes after migration is applied.
- [ ] High-volume delete, join, and relation checks do not produce missing-FK-index warnings.

## Phase 7 - POS Bootstrap and Offline Sync Performance

Priority: High

- [x] Rate-limit and validate `app/api/sync/bootstrap/route.ts`.
- [x] Add snapshot/cursor support for POS bootstrap so products, categories, stock, payment methods, and modifiers are not always fetched as one full payload.
- [x] Add `updatedAt` or version markers where syncable entities do not have reliable change cursors.
- [x] Add response compression and no-store/private cache policy appropriate for signed-in device bootstrap.
- [x] Add payload metrics for bootstrap size, product count, and request duration.
- [x] Keep the existing offline fallback behavior but make stale-data age visible to operators.

Acceptance checks:

- [ ] Large catalogs can open POS without timing out.
- [x] Repeat bootstrap requests fetch only changed records where possible.
- [x] Offline mode still has enough data for checkout.

## Phase 8 - Dashboard and Reporting Performance

Priority: Medium

- [x] Move dashboard top-products, payment mix, fulfillment, and variance summaries from broad in-memory reductions to database aggregation queries.
- [x] Add sensible date ranges and row limits for dashboard detail datasets.
- [x] Consider short-lived per-company summary caching for dashboard widgets where real-time precision is not required.
- [x] Lazy-load dashboard chart components so Recharts does not inflate the initial dashboard bundle.
- [x] Add performance tests or query timing logs for dashboard companies with large invoice and item counts.

Acceptance checks:

- [ ] Dashboard first load remains responsive for high-volume stores.
- [ ] Chart UI still renders after lazy loading.
- [ ] Summary numbers match existing behavior within the same date boundaries.

## Phase 9 - Data Exchange and Customer History Scalability

Priority: Medium

- [x] Convert full-company backup export to streaming or an async export job for large stores.
- [x] Add progress/status states for long-running backup exports.
- [x] Limit sensitive fields in backup output unless a full administrative backup is explicitly requested.
- [x] Replace customer purchase-history lookups by `customerName` with a relational purchase/customer link or dedicated history table.
- [x] Paginate customer debts, loyalty transactions, and purchase history instead of loading all child rows into the customer list.

Acceptance checks:

- [x] Backup export does not hold the entire company dataset in memory for large stores.
- [x] Customer list remains fast with many customers, debts, loyalty transactions, and invoices.
- [ ] Existing customer/debt/loyalty screens keep the same visible behavior.

## Phase 10 - Verification Contract

Run these checks after each implementation slice that touches the related area:

- [x] `npx.cmd prisma validate`
- [x] `npx.cmd prisma generate` after schema edits
- [x] `npx.cmd prisma migrate status`
- [x] `npx.cmd tsc --noEmit`
- [x] Targeted ESLint for changed app/components/lib files
- [x] Focused regression tests for auth, proxy routing, rate limiting, sync, exports, and offline POS
- [x] `npm.cmd audit --omit=dev --json`
- [x] `git diff --check`
- [x] Production build after route, dependency, PWA, or shared contract changes

## Documentation and Help Center Updates

- [x] Add operator-facing Help Center guidance for safe shared-device logout, offline mode data retention, and export permissions.
- [x] Add manager/admin documentation explaining export audit history and rate-limit behavior.
- [x] Update technical docs for dependency-risk exceptions, RLS posture, service-worker cache rules, and production rate-limit storage.
- [x] Add release notes for any change that affects offline POS availability, export formats, or manager permissions.

## Completion Rule

This TODO is complete only when:

- [x] Critical dependency vulnerabilities are resolved or explicitly accepted with owner/date.
- [x] Protected route matcher coverage is complete.
- [x] Protected data is not broadly cached by the service worker.
- [x] Production rate limiting is durable across instances.
- [x] RLS posture and browser grants are guarded by tests or checks.
- [x] Missing FK indexes are added or explicitly documented.
- [ ] Large bootstrap, dashboard, export, and customer-history paths have scalable implementations.
- [x] The verification contract passes.
