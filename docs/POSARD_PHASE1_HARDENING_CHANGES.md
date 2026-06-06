# POSard Phase 1 Hardening Changes

## Changed Files

- `app/(onboarding)/setup-company/_services/setup-company.service.ts` - hashes the initial manager PIN during company setup.
- `app/(protected)/accounts/_services/accounts.service.ts` - hashes updated manager/admin PINs instead of storing raw PIN values.
- `app/(protected)/dashboard/_components/DashboardScreen.tsx` - points report shortcuts to `/reports` routes.
- `app/(protected)/debts/_actions/debt.actions.ts` - maps unexpected server errors to safe user-facing messages.
- `app/(protected)/pos/_actions/order.action.ts` - rate-limits checkout/return manager PIN attempts and returns safe errors.
- `app/(protected)/pos/_actions/pos-auth.action.ts` - verifies hashed PINs, rate-limits manager PIN checks, and avoids raw error exposure.
- `app/(protected)/pos/_actions/pos.action.ts` - returns safe errors from POS metadata and printer config actions.
- `app/(protected)/pos/_actions/session.action.ts` - rate-limits manager PIN checks, verifies hashed PINs, and returns safe errors.
- `app/(protected)/pos/_services/order.service.ts` - verifies hashed manager PINs for debt, discount, and return approvals.
- `app/(protected)/pos/_services/session-mutation.service.ts` - verifies hashed manager PINs when opening sessions.
- `app/(protected)/pos/_services/_dto/offline.dto.ts` - removes the offline manager PIN verifier field from the bootstrap contract.
- `app/(protected)/pos/_services/offline-pin-verifier.client.ts` - disables client-side offline PIN matching now that verifier material is no longer exposed.
- `app/(protected)/pos/_services/offline-pin-verifier.service.ts` - removed the obsolete server helper that generated client-verifiable PIN material.
- `app/(protected)/report/_actions/report.action.ts` - removes legacy `/report` revalidation in favor of `/reports`.
- `app/api/sync/actions/route.ts` - stops trusting offline manager approval payloads for cash withdrawal/session close and uses safe sync errors.
- `app/api/sync/bootstrap/route.ts` - stops exposing manager PIN verifier material to the client.
- `lib/security/pin.ts` - adds PIN hashing, verification, and legacy PIN upgrade helpers.
- `lib/security/safe-action-error.ts` - adds shared safe server-action error mapping.
- `lib/security/security-config.ts` - adds the `managerPin` rate-limit bucket.
- `prisma/schema.prisma` - widens `Profile.pin` for hashed PIN storage.
- `prisma/migrations/20260606090000_widen_profile_pin_for_hashes/migration.sql` - widens the PIN column and hashes existing plain PINs using `pgcrypto`.
- `tests/pos/business-integrity-regression.test.ts` - adds regression coverage for invoice idempotency, duplicate references, returns, and offline replay safeguards.
- `tests/security/pin-hardening.test.ts` - adds PIN hashing and manager PIN lockout tests.

## Notes

- Existing plain PINs are converted by the migration into a non-plain SQL hash format.
- New PIN writes use the stronger `scrypt` format.
- SQL-migrated PINs are upgraded to `scrypt` after a successful PIN verification.
- Offline normal sale replay remains supported. Offline manager-sensitive cash withdrawal and session close actions now require review instead of trusting client-side manager verifier data.
