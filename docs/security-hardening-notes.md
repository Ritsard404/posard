# POSard Security Hardening Notes

Updated: 2026-07-02

## Dependency Risk Exceptions

`npm.cmd audit --omit=dev --json` is clean after pinning Next 16.2.9, aligning `eslint-config-next`, replacing `next-pwa` with Serwist, removing `xlsx`, and adding patched transitive overrides.

| Package chain | Severity | Owner | Review date | Current decision |
| --- | --- | --- | --- | --- |
| None for production audit scope | n/a | Engineering | 2026-07-30 | Keep `npm.cmd audit --omit=dev --json` in the verification contract and review overrides during dependency upgrades. |

## Service Worker Cache Rules

- Serwist generates the service worker from `worker/index.ts`.
- Protected app routes, navigations, RSC payloads, API GETs, reports, and exports use network-only runtime handling.
- Only safe static same-origin assets are cached.
- Logout calls `clearProtectedBrowserCaches()` and the service worker deletes legacy broad Workbox caches such as `apis`, `others`, `next-data`, and `static-data-assets`.
- POS offline checkout data remains in the explicit offline storage path so Sync Center can manage purge, retry, and review behavior.

## Import and Export Limits

- Product imports accept CSV and the POSARD Excel XML `.xls` template. Binary `.xlsx` uploads are rejected.
- Product import files are capped at 2 MB, 2 worksheets, 1,000 data rows, and a 10-second read timeout.
- Report exports are capped at a 366-day range, 5,000 rows, and 10 MB generated payload size.
- Product catalog exports are capped at 10,000 rows.
- Backups stream JSON in pages and exclude sensitive user records unless an admin explicitly requests a full backup.

## Rate Limit Storage

- Production uses the Prisma-backed `rate_limit_counter` table.
- Development and tests keep the in-memory store for fast local feedback.
- Rate-limit keys continue to include user or hashed IP, route, company, and terminal where provided.

## RLS Defense

- `public.is_admin(user_id uuid)` is recreated with `SECURITY DEFINER`, an explicit `search_path`, and fully qualified `public.profiles` references.
- `profiles`, `registration_requests`, and `customer_display_state` have migration-backed RLS policy contracts.
- Browser-facing RLS policies use `(SELECT auth.uid())` for authenticated user lookups.
- `tests/security/database-rls.test.ts` fails if `anon` or `authenticated` gains table privileges on a public table without RLS enabled.

## High-Volume Read Paths

- POS bootstrap supports `since` cursors and reports payload metrics so repeat loads fetch only changed catalog, category, modifier, stock, and payment-method data where possible.
- The offline fallback keeps stale-data age visible to operators.
- Dashboard top products, payment mix, fulfillment mix, terminal totals, variance summaries, and trend widgets use aggregate queries instead of broad in-memory reductions.
- Dashboard charts are dynamically loaded so Recharts is not part of the first dashboard client chunk.
- Short-lived widget caching is intentionally deferred because drawer status, approvals, sync health, and same-day sales need near-real-time reads; aggregate queries and bounded detail lists carry the current performance path.
- Customer history uses URL search and pagination, then loads debt, loyalty, and recent purchase summaries only for the visible customer page.
