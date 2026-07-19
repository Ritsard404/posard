# POSard Agent Instructions

## Purpose and stack

POSard is a mobile-first point-of-sale application for small businesses. It uses Next.js App Router, React, strict TypeScript, Prisma/PostgreSQL, Supabase Auth, Tailwind/shadcn-style components, Zustand, Dexie offline queues, Playwright, Serwist, and Capacitor Android.

Treat the repository and generated command output as the source of truth. Do not infer a route, field, enum, environment variable, dependency version, or successful result without checking it.

## Repository map

- `app/(marketing)`: public pages and SEO surfaces.
- `app/auth`: Supabase login, confirmation, recovery, and registration.
- `app/(protected)`: authenticated feature routes. Keep feature UI in `_components`, business/data logic in `_services`, validation in `_services/_validators`, DTOs in `_services/_dto`, and orchestration in `_actions`.
- `app/api/sync`: authenticated offline bootstrap and replay endpoints. Read its nested `AGENTS.md` before editing.
- `components`: shared UI and layout components. Prefer existing primitives.
- `lib`: cross-feature infrastructure, access control, security, messaging, Prisma, Supabase, and offline helpers.
- `prisma`: schema and append-only migrations. Read its nested `AGENTS.md` before schema work.
- `tests`: Node contract tests (`*.test.ts`) and Playwright tests (`*.spec.ts`).
- `worker`: Serwist service worker source.
- `android`: generated/native Capacitor project. Do not edit build output.
- `docs/user-guide`: operator-facing help. Update it and the Help Center for visible workflows.

## Required workflow

Use `Orient -> Investigate -> Plan -> Implement -> Test -> Verify -> Review -> Report`.

1. Inspect `git status`, relevant files, nearby tests, and the actual schema/contracts before editing.
2. Preserve unrelated and pre-existing changes. Do not reformat or refactor outside scope.
3. For broad work, write a short plan listing files, checks, risks, and rollback.
4. Reuse existing services, validators, DTOs, components, and helpers before creating files.
5. Add or update a regression test for confirmed bugs when practical.
6. Run checks proportional to risk, inspect `git diff`, and run `git diff --check`.
7. Report exact commands and outcomes. Label skipped or unverified behavior explicitly.

Simple documentation-only changes may use a shorter workflow, but still require diff review and relevant validation.

## Architecture and TypeScript

- Keep `strict` TypeScript. Do not add `any`, `@ts-ignore`, or `@ts-expect-error` to bypass errors.
- Prisma models are persistence shapes, not UI contracts. Return explicit DTO-safe objects across service/action boundaries.
- Prefer Prisma access in `_services`. Existing auth callbacks, protected layouts, and sync routes are documented exceptions; do not create new exceptions without a clear server-boundary reason.
- Keep `page.tsx` focused on server composition. Client state and browser APIs belong in explicit client components.
- Use Zod at untrusted boundaries. Validate before database or provider calls.
- Server actions must authenticate/authorize, catch errors, log server-side context safely, and return sanitized user messages.
- Never return database, provider, stack, token, or internal exception details to clients.
- Use `react-hook-form` for non-trivial managed forms. Use Zustand only for genuinely shared client state and store DTO-safe shapes.

## Authentication and authorization

- Supabase Auth owns credentials. Never store, return, log, or email passwords or PINs.
- Route presence in `proxy.ts` is not authorization. Enforce permission and company/branch scope in the server operation that reads or writes data.
- Reuse `lib/access-control-core.ts`, `lib/access-control.ts`, current-profile helpers, and existing service checks.
- Do not weaken redirects, session refresh, account status, role checks, or company scoping to make a test pass.
- Keep service-role and admin clients server-only. Never import them into client components.
- Validate redirect destinations as same-origin relative paths.

## Database and migrations

- `prisma/schema.prisma` is the application schema source of truth. `supabase-rbac.sql` owns Supabase Data API grants/policies for the intentionally exposed tables.
- Never edit, reorder, rename, squash, or delete an applied migration. Add a new migration.
- Do not run `migrate dev`, `migrate deploy`, seeds, raw writes, or destructive SQL without confirming the target and user intent.
- Use `prisma.$transaction` for multi-record invariants and use the transaction client throughout the callback.
- Scope tenant queries by company/branch/profile as required. Avoid unbounded lists.
- Raw SQL requires parameterization, a documented reason, and focused tests.
- Run `npm run prisma:validate` for schema-related work. Database integration tests are opt-in and must never target production.

## Offline and POS integrity

- Preserve idempotency keys, local invoice traceability, queue ordering, device/session ownership, and server revalidation.
- Never trust offline manager approval, price, inventory, session, or role assertions without server verification.
- Do not clear a queue item until the server confirms success or records a reviewable terminal state.
- Checkout, payments, inventory, cash sessions, returns, and sync replay require focused regression tests.
- Terminal pinless mode is terminal-scoped and defaults to PIN-required; do not turn it into a global bypass.

## UI, accessibility, and documentation

- Design from 375px upward and verify 375, 768, and 1280 widths for material UI changes.
- Use existing shadcn-style components and Tailwind tokens. Keep touch targets at least 48px for primary mobile actions.
- Provide loading, empty, error, and success feedback. Do not rely on hover or icon-only actions.
- Dynamic lists and tables need visible scroll affordances; do not clip content.
- Preserve supported light/dark behavior. Avoid new one-off visual systems.
- For operator-visible changes, update the matching `docs/user-guide/how-to-*.md`, the guide index when needed, and searchable Help Center content.

## Security, environment, dependencies, and logs

- Never print, commit, or paste secret values. `.env` and `.env.local` remain untracked; update `.env.example` with names and safe placeholders only.
- Only `NEXT_PUBLIC_*` values may enter browser bundles, and they must be intentionally public.
- Do not log auth tokens, passwords, PINs, connection strings, full payment data, or private customer data.
- Prefer structured logs with correlation IDs and identifiers that are safe for operations.
- Use dependencies already present. New packages, major upgrades, MCP additions, and production configuration changes require explicit justification.
- Pin automation/MCP versions. Do not use `@latest` in committed automation.
- Do not modify production credentials, Vercel settings, Supabase settings, or live data unless explicitly authorized.

## Verification matrix

- Every meaningful change: `npm run verify:quick`.
- Before completion for structural or release work: `npm run verify`.
- Node contracts only: `npm run test:unit`.
- UI/auth/checkout behavior: focused `npm run test:e2e -- <path> --workers=1`; use real browser verification when behavior changed.
- Database integration, approved non-production target only: set `ALLOW_DATABASE_INTEGRATION_TESTS=true`, then run `npm run test:integration`.
- Database changes: `npm run prisma:validate`, inspect the migration SQL, then use the explicitly approved migration command.
- Android changes: `npm run cap:sync` plus the relevant assemble/bundle command.
- Deployment changes: `npm run verify`, then inspect the actual deployment separately.

Do not mark an unexecuted check as passed. A failing required check blocks completion unless the user accepts the documented failure.

## Git and parallel-agent safety

- Do not use destructive Git commands or discard another contributor's work.
- Keep commits scoped. Do not commit unless asked.
- Parallel agents must receive disjoint file ownership. Use separate worktrees for overlapping implementation work.
- Investigator and reviewer roles should remain read-only. One integrator owns shared files, schema, lockfiles, and final verification.
- Before handoff, state changed files, tests, unresolved risks, and whether another agent is still working.

## Definition of done and final report

Completion requires implemented scope, relevant tests, authoritative verification, diff review, documentation for visible workflows, and no known secret exposure or unrelated edits.

Report:

- Summary: reused, modified, created, and intentionally not changed.
- Verification: exact commands with pass/fail/skip status.
- Security/database impact: state `none` when none.
- Documentation: files updated or why no user guide update was needed.
- Remaining risks and assumptions.
