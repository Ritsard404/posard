# Prisma and migration instructions

These rules extend the root `AGENTS.md` for `prisma/**`.

- Inspect `schema.prisma`, related services, and all migrations touching the same tables before proposing a change.
- Treat existing migration directories as append-only history. Never edit an applied migration; create a new timestamped directory with `migration.sql`.
- Separate Prisma schema ownership from Supabase Data API policy ownership. If a browser-facing table changes, review `supabase-rbac.sql` and relevant RLS contract tests.
- Before any migration command, identify the datasource and environment. Refuse destructive or production-targeted operations without explicit authorization and a rollback/backup plan.
- Prefer additive changes, staged backfills, and explicit constraints. Explain lock, rewrite, nullability, default, index, and data-loss risk.
- Use mapped database names consistently with the existing schema. Add indexes for verified query patterns, not speculation.
- Required checks: `npm run prisma:validate`, migration SQL review, `npm run test:unit`, and `npm run verify:quick`.
- Live checks are opt-in: set `ALLOW_DATABASE_INTEGRATION_TESTS=true` only for an approved non-production database, then run `npm run test:integration`.
- Do not run `migrate dev`, `migrate deploy`, `db push`, seeds, or raw write SQL as part of routine verification.
