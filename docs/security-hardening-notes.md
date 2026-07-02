# POSard Security Hardening Notes

Updated: 2026-07-01

## Dependency Risk Exceptions

`npm.cmd audit --omit=dev --json` currently reports 9 remaining findings after pinning Next 16.2.9, aligning `eslint-config-next`, pinning Supabase packages, and adding patched transitive overrides.

| Package chain | Severity | Owner | Review date | Current decision |
| --- | --- | --- | --- | --- |
| `next-pwa` -> Workbox -> `serialize-javascript` | High | Engineering | 2026-07-15 | Temporarily accepted while protected pages, APIs, RSC payloads, reports, and exports are forced to `NetworkOnly` and legacy broad caches are purged on service-worker activation/logout. Replace the PWA layer instead of downgrading blindly. |
| `xlsx` | High | Engineering | 2026-07-15 | Temporarily accepted because npm has no fixed release. Client workbook parsing is lazy-loaded only after a workbook file is selected; server exports still use `xlsx` until an export/import library replacement is selected. |
| `prisma` -> `@prisma/dev` -> `@hono/node-server` | Moderate | Engineering | 2026-07-15 | Temporarily accepted because npm suggests a Prisma 6.x downgrade. Keep Prisma CLI out of the production runtime and review when a patched Prisma 7.x release is available. |

## Service Worker Cache Rules

- Protected app routes, navigations, RSC payloads, API GETs, reports, and exports use `NetworkOnly` runtime caching.
- Only safe static same-origin assets are cached.
- Logout calls `clearProtectedBrowserCaches()` and the service worker deletes legacy broad Workbox caches such as `apis`, `others`, `next-data`, and `static-data-assets`.
- POS offline checkout data remains in the explicit offline storage path so Sync Center can manage purge, retry, and review behavior.

## Rate Limit Storage

- Production uses the Prisma-backed `rate_limit_counter` table.
- Development and tests keep the in-memory store for fast local feedback.
- Rate-limit keys continue to include user or hashed IP, route, company, and terminal where provided.

## RLS Defense

- `public.is_admin(user_id uuid)` is recreated with `SECURITY DEFINER`, an explicit `search_path`, and fully qualified `public.profiles` references.
- The customer display RLS policy uses `(SELECT auth.uid())` for the authenticated user lookup.
- `tests/security/database-rls.test.ts` fails if `anon` or `authenticated` gains table privileges on a public table without RLS enabled.
