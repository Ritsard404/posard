# POSard Codex Workspace Audit

Audit date: 2026-07-19  
Scope: repository structure, agent instructions, `.agents`, `.codex`, scripts, tests, Prisma/Supabase safety, authentication, offline sync, CI/CD, MCP, skills, secrets handling, and verification.  
Excluded: production writes, credential rotation, live deployment changes, destructive migrations, major dependency upgrades, and unrelated application refactors.

## Executive summary

POSard has strong domain coverage, strict TypeScript, extensive Prisma history, security contract tests, bounded offline replay, and a successful production build. The main weakness was not application architecture; it was that agents could not reliably discover or prove it. There was no root `AGENTS.md`, two always-on rule files contradicted the implementation, Node contract tests had no package command, live database checks ran whenever a developer `.env` happened to exist, lint scanned generated Android/service-worker artifacts, CI was absent, and the project MCP used an unpinned package.

This pass adds a concise instruction hierarchy, deterministic verification scripts, opt-in database integration checks, an environment example, a CI gate, generated-file checks, pinned MCP configuration, and a staged lint baseline. It does not change business behavior, schema, migrations, production systems, or credentials.

## Repository and architecture

- Type: single Next.js App Router application with a Capacitor Android wrapper; not a monorepo.
- Package manager: npm with `package-lock.json`.
- Entry points: App Router under `app`, root request proxy in `proxy.ts`, service worker source in `worker/index.ts`, Capacitor config in `capacitor.config.ts`.
- Data: PostgreSQL through Prisma; 56 migration directories and 56 migration SQL files.
- Auth: Supabase Auth with SSR clients, session refresh in `lib/supabase/proxy.ts`, protected layout checks, and operation-level access services.
- Offline: Dexie/client queues plus `/api/sync/bootstrap` and `/api/sync/actions`; server replay revalidates profile, company, session, terminal, and device context.
- Tests: 12 Node contract files and 9 Playwright specs.
- Deployment: Vercel-oriented Next.js build; Android uses the hosted app through Capacitor. No committed Docker, n8n, Raspberry Pi, Git hook, or prior GitHub Actions configuration was found.

## Workspace scorecard

Scores reflect repository evidence before this pass and the state after the implemented changes.

| Category | Before | After | Evidence and remaining deficiency when below 8 |
| --- | ---: | ---: | --- |
| Repository clarity | 7 | 9 | README was useful, but no authoritative agent map existed. Root and nested instructions now map responsibilities. |
| Agent instructions | 4 | 9 | Two long always-on files contradicted code and exposed unsafe examples. They now delegate to one root contract. |
| Context discoverability | 6 | 9 | Important boundaries were spread across README, skills, and code. `AGENTS.md` now routes agents to them. |
| Architecture documentation | 7 | 8 | README covers the app; this audit and nested safety instructions add agent-facing architecture. |
| Command consistency | 4 | 9 | Type, contract, Prisma, quick, full, and CI commands are now named package scripts. |
| Development reproducibility | 6 | 8 | `.env.example`, `npm ci` CI, pinned MCP, and deterministic scripts were added. |
| Test coverage | 7 | 8 | Existing security/POS contracts are broad; Node tests are now runnable as one suite. Runtime E2E still needs configured test accounts. |
| Verification reliability | 4 | 9 | `verify:quick`, `verify`, `verify:ci`, workspace checks, and warning caps now provide evidence-based gates. |
| Type safety | 8 | 9 | Strict mode was already enabled; the one linted explicit `any` was replaced with the existing DTO. |
| Error handling | 6 | 6 | Safe helpers exist, but at least 25 action/component paths still surface `error.message`. Migrate them to sanitized error helpers incrementally. |
| Logging and observability | 6 | 6 | Correlation IDs and some aggregate metrics exist, but logging is console-based and 62 call sites lack a unified structured/redaction contract. |
| Security controls | 7 | 8 | Security headers, rate limits, RLS contracts, secret ignores, and auth boundaries exist; automated secret/generated-file checks were added. |
| Database safety | 6 | 9 | Live RLS checks previously activated from ambient `.env`; they now require explicit non-production opt-in. |
| Migration safety | 7 | 9 | Existing history is complete; nested rules and workspace checks enforce append-only expectations and complete directories. |
| Authentication safety | 8 | 8 | Same-origin redirect guards, Supabase verification, server checks, and auth contract tests were confirmed. |
| Offline synchronization safety | 8 | 9 | Existing idempotency and review states are strong; nested instructions now protect those invariants. |
| CI/CD quality | 2 | 8 | No workflow existed. A least-privilege GitHub verification workflow now runs `npm ci` and `verify:ci`. |
| Deployment safety | 6 | 7 | Local production build succeeds, but there is no linked deployment smoke/rollback automation. Add it only with deployment authorization. |
| MCP configuration quality | 6 | 8 | One project-scoped, approval-gated MCP remains; its package is now pinned instead of `@latest`. |
| Skill organization | 5 | 6 | Useful procedural skills exist, but some vendor skills exceed the concise target, include auxiliary files, or have vague metadata. Avoid mass edits; curate them separately. |
| Parallel-agent readiness | 4 | 8 | Root rules now define read-only roles, disjoint ownership, worktrees, one integrator, and authoritative verification. |
| Git workflow safety | 7 | 9 | Existing ignores were solid; generated Python bytecode is removed and now forbidden by checks. |
| Documentation quality | 7 | 8 | README and 53 docs were present; SMTP setup, verification commands, and agent audit documentation are now aligned. |
| Ease of onboarding | 6 | 8 | A new developer/agent can now copy `.env.example`, use one map, and run named verification commands. |
| Resistance to AI hallucinations | 4 | 9 | Rules now require file/command/schema evidence, actual command results, diff review, and explicit skipped checks. |

## Instruction, script, skill, and MCP map

```text
AGENTS.md                              common repository contract
├─ prisma/AGENTS.md                    schema and migration safety
└─ app/api/sync/AGENTS.md              offline replay safety

.agents/rules/*.md                     thin always-on adapters to AGENTS.md
.agents/workflows/posard-pos.md         POS/session investigation procedure
.agents/skills/*/SKILL.md               task-triggered external/domain procedures
.codex/skills/ui-ux-pro-max/SKILL.md    optional UI research database

package.json
├─ verify:workspace -> scripts/verify-workspace.mjs
├─ test:unit / test:integration -> scripts/run-tests.mjs
├─ verify:quick -> workspace + Prisma + types + lint + Node contracts
└─ verify -> verify:quick + production build

.codex/config.toml                     project-scoped Next DevTools MCP
.github/workflows/verify.yml           clean-install CI execution
```

Instructions define policy and boundaries. Scripts enforce deterministic facts. Skills provide optional task-specific procedures. MCP provides scoped tools and does not replace repository evidence or verification.

## Verification commands

| Command | Use |
| --- | --- |
| `npm run verify:workspace` | Check required files/scripts, tracked sensitive/generated files, MCP pinning, env names, migrations, and skill frontmatter. |
| `npm run typecheck` | Any TypeScript or TSX change. |
| `npm run prisma:validate` | Schema, service, migration, or Prisma configuration work. |
| `npm run test:unit` | Run all Node contracts; live database assertions are skipped. |
| `npm run lint` | Block lint errors and any increase above the documented 58-warning compiler baseline. |
| `npm run verify:quick` | Required after every meaningful change. |
| `npm run verify` | Required before completing structural/release work; adds the production build. |
| `npm run test:e2e -- <path> --workers=1` | UI, auth, checkout, offline, and browser-visible changes. |
| `npm run test:integration` | Refuses to run unless `ALLOW_DATABASE_INTEGRATION_TESTS=true`; approved non-production database only. |

Formatting has no standalone command because no formatter dependency/configuration is installed. `prisma format --check` covers Prisma formatting; `git diff --check` covers whitespace errors.

## MCP recommendations

| MCP | Decision | Reason and restriction |
| --- | --- | --- |
| Next DevTools project MCP | Keep, pinned | Useful for Next-specific inspection. Keep approval mode and project scope; do not grant production mutation access. |
| Documentation lookup/Context7 | Keep globally if available | Use for current library/API documentation; overlaps with Next docs, so prefer Next DevTools only for Next runtime-specific tasks. |
| Playwright/browser | Keep as CLI/skill | Browser verification is needed; it does not require another overlapping MCP. |
| GitHub | Optional, read-first | Add only for PR/issue work. Restrict write operations to explicit publish requests. |
| Vercel | Optional, task-scoped | Enable only for deployment investigation or authorized changes. Separate read and write authority. |
| Supabase/PostgreSQL | Do not add broad production access | Prefer Prisma/static contracts. If added, use project-scoped read-only non-production credentials; require explicit approval for writes. |

The smallest practical default set is current documentation lookup, project Next inspection, and browser verification. Do not add Slack, email, calendar, or general filesystem MCPs for this repository.

## Skills recommendations

- Keep: `playwright-cli`, `prisma-client-api`, `supabase-postgres-best-practices`, `vercel-react-best-practices`, `capacitor-best-practices`, and `capacitor-plugins`; they represent repeatable procedures or focused references.
- Keep but refine later: `posard-workspace` and `posard-ui`. Move durable common rules to `AGENTS.md` and shorten their bodies to only trigger-specific workflows.
- Restrict by task: `accountant-expert`, `mobile-android-design`, `seo-audit`, and `documentation-writer`. They should not load for ordinary application work.
- Rewrite metadata later: `ui-ux-pro-max` has a vague description and tracked data volume; specify exact UI research triggers and keep generated caches excluded.
- Do not create a generic verification skill. Verification is deterministic and now belongs in package scripts plus `AGENTS.md`.
- Candidate only after repeated need: `review-prisma-migration` or `test-offline-sync`, each with a small `SKILL.md` that invokes existing scripts and nested instructions. Do not create them until repeated use proves value.

No vendor skill was deleted or mass-rewritten. That would make lockfile provenance and future updates harder to reason about.

## Security findings

### Critical

- None confirmed. No tracked `.env`, private key, credential file, or production write was found or performed.

### High

- Fixed: live RLS integration checks previously ran whenever `DATABASE_URL` or `DIRECT_URL` existed. They now require explicit opt-in and warn against production.
- Fixed: no CI or authoritative command existed, allowing unverified completion claims. Named gates and CI now exist.
- Remaining: at least 25 code paths use raw `error.message` patterns. Risk is accidental provider/database detail disclosure. Convert actions to `toSafeActionError` or stable allowlisted domain errors in a focused hardening phase.

### Medium

- Fixed: MCP used `next-devtools-mcp@latest`; it is pinned to the inspected `0.4.0` release.
- Fixed: generated `.pyc` files were tracked; they are removed and ignored.
- Partially fixed: lint had 44 application errors after generated files were excluded. One explicit `any` was fixed; 43 React compiler findings are visible warnings and capped as debt.
- Remaining: CSP is report-only. Move to enforcement only after collecting violations and testing Supabase, service worker, printing, and device paths.
- Remaining: `supabase-rbac.sql` is manually applied and can drift from migrations. Add a non-production policy/grant verification job before automating deployment.

### Low

- Fixed: `SETUP.md` omitted SMTP/Gmail variables while README supported them.
- Remaining: build output shows legacy-looking route spellings such as `subcriptions` and `setting`. Confirm redirects/usage before cleanup; do not remove routes based on spelling alone.

## Prioritized recommendations

| Priority | Problem and evidence | Risk | Solution | Files | Effort | Implement now |
| --- | --- | --- | --- | --- | --- | --- |
| Critical | Ambient live DB integration activation | Accidental production reads | Explicit opt-in runner and nested DB rules | test, scripts, AGENTS | Small | Yes, done |
| High | No root instructions; 608 contradictory always-on lines | Wrong architecture/security changes | Root contract plus two narrow nested files | AGENTS and `.agents/rules` | Medium | Yes, done |
| High | No authoritative verification or CI | False completion and regressions | Named scripts, workspace checker, CI | package, scripts, workflow | Medium | Yes, done |
| High | Raw `error.message` in at least 25 paths | Internal detail leakage | Migrate by feature to sanitized helper with tests | actions/components | Medium | No; separate behavior-sensitive phase |
| Medium | Generated artifacts polluted lint and Git | Slow/noisy checks | Ignores, deletion, tracked-file guard | ESLint, gitignore, checker | Small | Yes, done |
| Medium | 43 existing React compiler lint findings | Future compiler/performance risk | Resolve incrementally, then lower warning cap | 21 UI/server files | Large | Partial; warnings capped |
| Medium | Manual RLS/grant drift | Browser access regression | Non-production verification job and policy manifest | SQL/tests/CI | Medium | No; needs database target decision |
| Medium | No deployed smoke/rollback automation | Local success may differ in production | Read-only deployment verification, then controlled promotion | deployment workflow | Medium | No; requires authorization |
| Optional | Docker, n8n, Pi tooling absent | None for current app | Add only when repository code uses them | future | Varies | No |

## Parallel-agent workflow

- Investigator: read/reproduce/trace only; provide evidence and likely cause.
- Planner: define scope, files, tests, risks, and rollback; no edits unless assigned.
- Implementer: own a disjoint file set, make minimal changes, add tests, run targeted checks.
- Reviewer: independently inspect the diff, authorization, security, races, regressions, and test gaps; remain read-only.
- Verifier: run authoritative commands and report raw failures; do not repair unless reassigned.
- Integrator: sole owner of shared files such as schema, lockfile, package scripts, and final merge/verification.

Use separate Git worktrees for overlapping code work. Do not run multiple editing agents in the same files. Record ownership before edits and hand off changed files plus command evidence.

## Files created

- `AGENTS.md`: authoritative repository instructions.
- `prisma/AGENTS.md`: schema and migration safety.
- `app/api/sync/AGENTS.md`: offline replay safety.
- `.env.example`: safe environment-variable contract.
- `scripts/run-tests.mjs`: cross-platform Node test runner with database opt-in.
- `scripts/verify-workspace.mjs`: deterministic workspace invariant checker.
- `.github/workflows/verify.yml`: least-privilege clean-install CI gate.
- `docs/engineering/codex-workspace-audit.md`: this evidence-backed audit.

## Files modified

- `package.json`: authoritative test and verification scripts; warning cap.
- `eslint.config.mjs`: generated-output boundaries and staged React compiler baseline.
- `.gitignore`: Python cache exclusions.
- `.codex/config.toml`: pinned Next DevTools MCP.
- `.agents/rules/posard.md`: concise root-instruction adapter.
- `.agents/rules/posard-ui-style.md`: concise, implementation-aligned UI adapter.
- `.agents/workflows/posard-pos.md`: current POS/session/offline invariants.
- `tests/security/database-rls.test.ts`: explicit live-database opt-in.
- `components/layout/CashTrackTrigger.tsx`: existing DTO replaces explicit `any`.
- `README.md` and `SETUP.md`: verification and SMTP setup alignment.

Five generated `.pyc` files under `.codex/skills/ui-ux-pro-max/scripts/__pycache__` were removed. They are generated caches and can be recreated from the Python sources.

## Commands executed and results

- `npm view next-devtools-mcp version dist-tags --json`: passed; current inspected release was `0.4.0`.
- `npx prisma validate`: passed.
- `npx prisma format --check`: passed.
- `npm audit --omit=dev --audit-level=high --json`: passed; zero reported vulnerabilities.
- `node scripts/verify-workspace.mjs`: passed after generated cache cleanup and checker correction.
- `npm run test:unit`: passed; 60 tests, 58 passed, 2 intentionally skipped live DB checks.
- `npm run lint`: passed with 0 errors and 58 capped warnings.
- `npm run build`: passed; Prisma Client generated, Next.js compiled, TypeScript completed, and 71 static pages generated.
- `npm run verify`: passed end to end in 157.4 seconds, confirming the documented combined verification entry point.

## Verification status

| Check | Status | Evidence |
| --- | --- | --- |
| Installation | Not rerun | Existing `node_modules` was used; CI uses `npm ci`. |
| Formatting | Passed for Prisma | `prisma format --check`; no repository formatter is configured. |
| Lint | Passed with debt | 0 errors, 58 warnings; warning cap prevents increases. |
| Type checking | Passed | `tsc --noEmit` completed successfully. |
| Unit/contracts | Passed | 58 passed, 2 live DB checks skipped. |
| Integration | Not run | Requires explicit approved non-production target. |
| End-to-end | Not run for this audit | No application workflow changed; full suite needs test accounts/database. |
| Prisma validation | Passed | Schema valid and formatted. |
| Production build | Passed | Next.js 16.2.9 webpack build completed. |
| Dependency audit | Passed | No production dependency vulnerabilities reported by npm audit. |

## Remaining risks and next actions

1. High: replace raw action error messages with sanitized domain errors, feature by feature.
2. Medium: resolve the 58 lint warnings, starting with impure render/static component findings, then reduce the cap.
3. Medium: run the new CI workflow on a branch/PR and confirm dummy build configuration remains sufficient in GitHub-hosted Linux.
4. Medium: design non-production RLS/grant verification before automating `supabase-rbac.sql` checks.
5. Medium: add authorized read-only Vercel deployment smoke checks and document rollback.
6. Optional: curate third-party skills into a smaller project-approved set; do not fork vendor content without an update strategy.

Assumptions: the local database environment may be production-like, so no live integration query, migration status command, seed, or write was run. Existing application work outside the audit-owned files was not modified or treated as audit scope.
