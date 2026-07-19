# Phase: Playwright End-to-End System Test

## Goal

Build reliable Playwright coverage from authentication through every money, stock, and reporting transaction in POSARD. The suite must expose functional bugs, permission leaks, duplicate writes, accounting mismatches, and user-visible performance regressions.

## Current Baseline

- Playwright is configured in `playwright.config.ts` and runs Chromium against the local Next.js server.
- Existing browser coverage includes login, logout, redirects, sign-up, manager/cashier POS responsiveness, product CRUD, product stock adjustment, and basic offline payload validation.
- Existing auth and product fixtures already create and clean up test data.
- The largest missing coverage is the complete transaction lifecycle and its database side effects.

## Implementation Status - 2026-07-15

Implemented in this phase:

- Destructive-fixture guard requiring `E2E_ALLOW_DATABASE_WRITES=true`, required database/Supabase variables, and rejection of obviously production-named hosts.
- Tagged npm commands for smoke, transaction, permission, offline, and performance runs.
- Existing suites tagged without duplicating their coverage.
- Responsive POS checkout upgraded to verify the saved invoice, exact totals, item data, idempotency key, stock deduction, and audit record.
- Pinned Playwright Chromium installed locally; Prisma Client regenerated from the current schema.
- TypeScript, Playwright test discovery, diff checks, and the two-test offline suite pass.
- Disposable database writes authorized locally with `E2E_ALLOW_DATABASE_WRITES=true`.
- Product management destructive suite passes 6/6 after stale search and strict-text locators were corrected.
- Fixed transaction integrity so paid invoice items persist as `PAID` instead of retaining the cart's transient `PENDING` status; debt items retain the final debt invoice status and void lines remain `VOID`.
- Fixed incremental offline bootstrap merging so an empty delta no longer erases the cached catalog during responsive remounts.
- Disabled service-worker registration in development while preserving production PWA behavior.
- Added an authenticated manager sweep covering 37 static/company-scoped protected routes; the sweep passes without rendered 5xx errors.
- Corrected approval-request sign-up messaging so pending users are not told their account is already created or needs no approval.
- Added deterministic payment calculation coverage for VAT, statutory discounts, caps, cash change, under-tender, split tender, and negative-total prevention.
- Capped persisted discount totals at gross sales to keep zero-total receipts internally reconcilable.
- Extended the reconciled browser lifecycle through a manager-approved full return: invoice/item return state, return lines, PHP 25 refund, stock restoration, and two approval/audit entries are asserted in PostgreSQL.
- Added manager-approved whole-order void coverage: zero financial totals, VOID item state, unchanged stock, reason, and audit entry are asserted.
- Scoped void manager resolution to the cashier company, closing a forged cross-company manager-email authorization path.
- Hardened teardown ordering for restrictive return/profile audit foreign keys and verified zero leaked companies, products, categories, returns, or temporary approvers.
- Added a configurable Prisma pg pool limit (default 3) to reduce development/test connection pressure.
- Added an independent approved debt lifecycle: PHP 27 unpaid invoice, PHP 10 partial collection, PHP 17 final collection, payment history, PAID balance, stock deduction, and four audit entries reconcile exactly.
- Added cashier-session close coverage with PHP 1,000 counted cash, manager approval, timestamp/terminal state, one audit entry, and an already-closed service guard contract.
- Added purchase-order UI coverage through draft, submit, approve, ordered, partial receive, and full receive, including capped over-receipt, stock, receiving records, lots, movements, and audits.
- Added branch-transfer UI coverage through request, approval, dispatch, and full receiving, including exact source/destination movement rows and no duplicate receive action.
- Added tenant validation for PO supplier/product IDs and transfer terminal/product IDs, plus same-terminal rejection.
- Added tenant validation for expense category/terminal, non-sales-income terminal, and supplier update/archive IDs before the next management-workflow browser pass.
- Added expense UI coverage for approve/post, reject, and cancel branches plus exact audit totals; added PHP 300 non-sales-income reconciliation.
- Added supplier create/archive and promotion draft/activate/pause/duplicate/archive browser coverage with audit assertions.
- Full service/security/accounting contract run passes 52/52.
- Added physical inventory control coverage for manual adjustment, matching/shortage/overage counts, approval/rejection, damaged-stock disposal, exact movements, stock totals, and ten audit events.
- Added customer/loyalty reporting coverage for tenant-scoped search, 26-record pagination, earn/redeem history, and net point balance.
- Added enabled business-fit workflow coverage for service booking, repair intake, wholesale sales order, restaurant open ticket, prescription verification, and kitchen queued/preparing/ready/served/cancelled transitions.
- Scoped every business-fit customer/product/staff/terminal reference to the viewer company and added a company fragment to globally unique workflow numbers.
- Corrected business-fit schema/UI mismatches for omitted optional repair and delivery fields.
- Added exact sales-report UI reconciliation plus authenticated CSV and Spreadsheet XML export content/security-audit coverage.
- Transaction directory passes 8/8 together in 8.7 minutes with zero leaked E2E tenant records; the report/export scenario also passes independently.
- Full Chromium run reached 35/38 in 28.2 minutes. The three failures were stale landing-page or load-sensitive timing assertions; documented login, debt lifecycle, and product surface all pass in focused reruns after corrections.

Defects found during the destructive run:

- POS catalog bootstrap could replace a populated catalog with an empty list during a desktop-to-phone remount; fixed and verified by the reconciled responsive checkout.
- Development PWA service-worker registration repeatedly failed while tests ran; fixed by limiting registration to production builds.
- Approval-based sign-up displayed direct-registration success instructions; fixed and verified in Chromium.
- Discounts larger than gross sales produced contradictory receipt fields; fixed by capping the recorded discount at gross.
- PostgreSQL emits a deprecated concurrent `client.query()` warning; this should be removed before upgrading to pg 9.
- Product browser tests currently take roughly 21-45 seconds each, exceeding the intended performance direction.
- The protected route matrix takes about 8 minutes in Next.js development mode, and the current complete serialized browser run takes 28.2 minutes.
- The full-run debt checkout needed more than its 30-second UI completion wait under accumulated development-server load but passed in 1.1 minutes when rerun with the two other failures; performance/load stabilization remains open.

Next priority: partial/invalid return and item-void negative cases, report matrix reconciliation, concurrency/offline recovery conflicts, and performance baselines. Production database provisioning remains intentionally deferred until the Definition of Done is satisfied.

## Test Rules

- [ ] Run destructive E2E tests only against a dedicated test database and Supabase project; fail fast if the environment is not explicitly marked as E2E.
- [ ] Never run transaction tests against production or a shared staging database.
- [ ] Give every seeded record a unique E2E run ID and delete it in `finally`/fixture teardown.
- [ ] Prefer role, label, placeholder, and test-id locators; do not depend on CSS structure or generated classes.
- [ ] Verify important writes through both the UI and Prisma/database state.
- [ ] Assert exact totals, VAT, discounts, tender, change, inventory deltas, ledger entries, and statuses.
- [ ] Avoid fixed sleeps; wait on visible state, responses, or database conditions.
- [ ] Save traces, screenshots, and video only on failure.
- [ ] Keep tests independent, repeatable, and safe to retry.

## Phase 0 - Test Safety and Foundation (P0)

### Tasks

- [x] Add a test-environment guard that requires a dedicated E2E flag and rejects known production URLs.
- [x] Add project setup that validates required environment variables without printing their values.
- [ ] Extend auth fixtures for admin, manager, cashier, pending, disabled, and unassigned users.
- [ ] Create reusable company, branch, terminal, session, customer, supplier, and transaction fixtures.
- [ ] Add deterministic money helpers using decimal-safe comparisons.
- [ ] Add cleanup helpers that remove seeded records in dependency order.
- [ ] Save authenticated storage states for each role to reduce repeated UI logins while retaining one real login-flow suite.
- [ ] Tag tests as `@smoke`, `@transaction`, `@permissions`, `@offline`, `@performance`, and `@destructive`. (Core existing suites tagged; future suites still need tags.)
- [x] Add npm scripts for smoke, transaction, performance, and full E2E runs.

### Acceptance Criteria

- [ ] The suite aborts before mutation when pointed at an unsafe environment.
- [ ] A failed test leaves no E2E invoices, inventory, customers, sessions, or payments behind.
- [ ] Tests can run twice consecutively with the same result.

## Phase 1 - Authentication, Onboarding, and Access (P0)

Suggested files: extend `tests/auth/` and add `tests/access/role-access.spec.ts`.

- [ ] Valid admin, manager, and cashier login reaches the correct destination.
- [ ] Invalid, empty, pending, disabled, and unapproved accounts are rejected safely.
- [ ] Logout clears the session; browser Back cannot reopen protected data.
- [ ] Expired/revoked sessions redirect to login without exposing protected content.
- [ ] Unauthenticated deep links preserve a safe return destination after login.
- [ ] Open-redirect attempts are rejected.
- [ ] First-time company setup creates the company and assigns the user once only.
- [ ] Terminal selection and cashier-session requirements are enforced before POS use.
- [ ] Admin, manager, and cashier route access matches the permission matrix.
- [ ] Direct URL navigation and server actions reject unauthorized roles, even when UI controls are hidden.
- [ ] Rate-limited login and server failures show safe, recoverable messages.

## Phase 2 - POS Sale and Checkout (P0)

Suggested file: `tests/transactions/pos-sale.spec.ts`.

- [ ] Open a cashier session with a known opening cash amount.
- [ ] Find products by name and barcode; category filtering returns the correct products.
- [ ] Add, remove, and edit item quantities without negative or zero invalid quantities.
- [ ] Validate tracked, untracked, out-of-stock, variant, unit, serial, bundle, and modifier items.
- [ ] Validate line discount, order discount, percentage/fixed discount, discount caps, VAT-inclusive/exclusive/exempt totals, and rounding.
- [ ] Verify manager approval is required where configured and invalid PINs do not mutate data.
- [ ] Complete exact-cash, over-tendered cash, card/e-payment, reference, split, and mixed payment sales.
- [ ] Reject underpayment, invalid reference details, repeated submit clicks, and stale stock.
- [ ] Confirm one invoice, correct items/payments, one inventory deduction, audit data, and a printable receipt. (Invoice, items, inventory, audit, and idempotency covered; payment-row and print assertions remain.)
- [ ] Verify double-click, page refresh, browser retry, and request retry cannot create duplicate invoices.
- [ ] Verify customer display progresses through cart, payment, completed, and idle states.
- [ ] Reprint a receipt without creating a new financial transaction.

### Core Sale Invariant

For every completed sale:

- [ ] `subtotal - discounts + tax = grand total`.
- [ ] `payments = grand total` unless the approved debt workflow is used.
- [ ] tracked inventory decreases exactly once.
- [ ] invoice number/idempotency key is unique.
- [ ] reports and cashier totals reflect the same transaction.

## Phase 3 - Corrections, Returns, Debt, and Cash (P0)

Suggested files: `tests/transactions/void-return.spec.ts`, `debt.spec.ts`, and `cash-session.spec.ts`.

- [ ] Void one cart item and a whole order with a reason and required manager approval.
- [ ] Reject unauthorized, already-voided, or invalid-state void attempts.
- [ ] Perform partial and full returns; prevent returns above the sold quantity.
- [ ] Verify return totals, stock restoration, return documents, audit trail, and report changes.
- [x] Create an unpaid/debt sale for an eligible customer and enforce configured permissions/limits.
- [ ] Record partial and final debt collection; prevent overpayment and duplicate collection. (Partial/final happy path covered; negative cases remain.)
- [x] Verify customer balance and debt status after each payment.
- [ ] Record cash-in and cash-out with reasons; reject invalid amounts.
- [ ] Close a cashier session with expected and counted cash and verify variance. (Exact counted cash, approval, terminal state, and audit covered; non-zero variance remains.)
- [ ] Prevent new POS writes on a closed session and prevent closing the same session twice. (Closed UI state and service guard covered; direct duplicate submission remains.)

## Phase 4 - Inventory and Procurement Transactions (P1)

Suggested files under `tests/transactions/`.

- [x] Product/category CRUD and manual stock adjustment continue to pass.
- [x] Create, approve, receive partially, receive fully, and cancel a purchase order.
- [x] Verify receiving updates stock lots, costs, inventory, and PO status once.
- [x] Create, dispatch, receive, and cancel a branch transfer. (`reject` is not an enabled transfer action in the current schema/UI.)
- [x] Verify source and destination inventory deltas and prevent duplicate receiving.
- [x] Run stock count with matching, shortage, and overage results; verify ledger adjustments. (Also covers rejection, audit events, and damaged-stock disposition.)
- [ ] Validate lot expiry, serial uniqueness, and insufficient-stock protections.
- [x] Confirm inventory ledger entries reconcile to product inventory after every workflow covered by the procurement, transfer, count, adjustment, and disposition suites.

## Phase 5 - Other Business Transactions (P1)

- [ ] Create, edit, approve/void, and filter expenses; verify status and reports. (Create, approve/post, reject, cancel, and audit covered; edit/filter/report reconciliation remain.)
- [x] Create and record non-sales income if enabled.
- [ ] Create/edit customers; earn and redeem loyalty; prevent negative or duplicate balances. (Customer/loyalty reporting, tenant-scoped search, pagination, earn/redeem history, and net balance are covered; no enabled customer-edit or loyalty-mutation UI currently exists, and negative/duplicate mutation guards remain.)
- [ ] Create promotions and verify eligibility, date range, usage limits, stacking, and redemption log. (Management lifecycle covered; checkout eligibility/redemption remain.)
- [x] Exercise supplier lifecycle and prevent unsafe deletion when referenced. (Create/archive UI and company-scoped update/archive service boundaries covered.)
- [x] Cover service booking, repair job, sales order, open ticket, prescription verification, and kitchen ticket flows when their business presets are enabled. (Kitchen covers queued → preparing → ready → served and cancellation with audit reconciliation.)
- [ ] Verify disabled business features are hidden and inaccessible by direct navigation/action.

## Phase 6 - Reports, Exports, Audit, and Reconciliation (P1)

- [ ] Dashboard totals update after sale, void, return, expense, and debt payment.
- [ ] Daily sales, payment-method, VAT, PWD/senior, cashier, terminal, and branch reports match seeded transactions exactly.
- [ ] Date, branch, terminal, cashier, status, and pagination filters are correct at timezone boundaries.
- [x] CSV/spreadsheet exports download successfully and contain the expected headers and rows. (Sales report CSV and Spreadsheet XML `.xls` both reconcile to a seeded transaction and write security audits.)
- [ ] Backup and product-catalog exports require permission and do not expose another company.
- [ ] Audit trail records actor, company, branch/terminal context, action, target, and time without secrets.
- [ ] Company A can never read or mutate Company B data through UI, URL parameters, exports, or actions.

## Phase 7 - Offline, Recovery, and Concurrency (P1)

Suggested file: `tests/transactions/offline-transaction.spec.ts`.

- [ ] Complete an offline sale after the product snapshot and active session are cached.
- [ ] Confirm a provisional receipt and pending sync state are shown.
- [ ] Restore connectivity and verify exactly one server invoice and inventory deduction.
- [ ] Retry the same idempotency key and verify no duplicate transaction.
- [ ] Queue offline void/cash operations only when supported; show clear blocks otherwise.
- [ ] Simulate stale stock, expired session, rejected approval, and server conflict during sync.
- [ ] Verify failures remain recoverable in Sync Center and do not silently disappear.
- [ ] Run two browser contexts selling the last unit; only one transaction may succeed.
- [ ] Run simultaneous debt collection, PO receiving, transfer receiving, and session close attempts; prevent double writes.

## Phase 8 - Resilience and Security UX (P2)

- [ ] Inject 400, 401, 403, 409, 429, 500, timeout, and connection-reset responses for critical actions.
- [ ] Ensure buttons recover from loading state and users can safely retry.
- [ ] Ensure raw Prisma, SQL, stack traces, tokens, keys, and internal errors never appear in the page.
- [ ] Verify forms reject malformed, oversized, negative, and script-like inputs.
- [ ] Test refresh, duplicate tabs, Back/Forward, and navigation during pending transactions.
- [ ] Check console errors, unhandled exceptions, failed requests, hydration errors, and accessibility errors during smoke flows.

## Phase 9 - Performance and Usability Budgets (P2)

Suggested file: `tests/performance/critical-flows.spec.ts`. Record cold and warm runs separately.

- [ ] Capture navigation timing, Core Web Vitals, long tasks, request count, and transferred bytes for login, dashboard, POS, products, and reports. (Dashboard, POS, products, and reports now covered for first-run and warm navigation; login and interaction timing remain.)
- [x] Set initial CI budgets after collecting a stable baseline; warm production routes enforce navigation <= 3 s, LCP <= 2.5 s, CLS <= 0.1, and longest task <= 200 ms.
- [ ] POS becomes interactive with 1,000 products within an agreed budget.
- [ ] Product/barcode search shows results within 300 ms after input settles.
- [ ] Add-to-cart feedback appears within 150 ms and checkout submission within 2 s excluding printer work.
- [ ] Reports with representative data load within 3 s and do not issue duplicate queries/requests. (Warm optimized production navigation is 2.17 s/LCP 2.38 s; representative-volume and duplicate-request analysis remain.)
- [ ] Check for repeated API calls, oversized payloads/images, unnecessary route reloads, and growing DOM/list memory.
- [ ] Run a 20-sale loop and compare first/last transaction time and browser heap for degradation.
- [ ] Test desktop, tablet, and mobile viewports for clipped controls, overflow, touch targets, and keyboard operation.
- [ ] Keep performance tests serial and separate from functional pass/fail until baselines are stable.

## Phase 10 - CI and Release Gate (P2)

- [ ] Run `@smoke` on every pull request.
- [ ] Run transaction and permission tests on merge or a protected test environment.
- [ ] Run the full destructive and performance suites nightly.
- [ ] Use one worker initially for shared financial fixtures; increase only after isolation is proven.
- [ ] Upload Playwright HTML report, trace, screenshot, and video artifacts on failure.
- [ ] Quarantine flaky tests only with an owner, issue, evidence, and removal date.
- [ ] Fail releases for P0 smoke/transaction failures, data leaks, duplicate writes, or unreconciled totals.

## Recommended Implementation Order

1. Phase 0: environment guard, fixtures, cleanup, and tags.
2. Phase 1: role access and session enforcement.
3. Phase 2: one exact-cash sale with database reconciliation.
4. Phase 3: void, return, debt, cash movement, and session close.
5. Phase 4: purchase receiving and branch transfers.
6. Phase 6: reports and audit reconciliation.
7. Phase 7: offline idempotency and concurrency.
8. Phases 5, 8, 9, and 10: extended workflows, resilience, performance, and CI.

## Definition of Done

- [ ] Every enabled user-guide transaction has at least one happy-path browser test.
- [ ] Every money/stock mutation has permission, validation, idempotency, and database assertions.
- [ ] Sale -> void/return -> reports -> cashier close reconciles to expected exact values.
- [ ] Cross-company and cross-role access tests pass.
- [ ] Offline replay and concurrent submission do not duplicate transactions.
- [ ] Critical flows meet agreed performance budgets on the CI test environment.
- [ ] Full suite passes twice consecutively without leaked test data or flaky retries.
- [ ] Any discovered defects are recorded with trace, reproduction steps, affected role/data, severity, and expected behavior.

## Useful Commands

```powershell
npm.cmd run test:e2e -- --grep "@smoke"
npm.cmd run test:e2e -- --grep "@transaction"
npm.cmd run test:e2e -- --grep "@permissions"
npm.cmd run test:e2e -- --grep "@offline"
npm.cmd run test:e2e -- --grep "@performance" --workers=1
npm.cmd run test:e2e
```

## Delete This TODO Only When

- The Definition of Done is satisfied.
- P0 flows are mandatory release gates.
- Remaining skipped workflows are explicitly disabled product features, not untested active functionality.
- The suite documentation names the safe E2E environment and cleanup procedure without containing secrets.
