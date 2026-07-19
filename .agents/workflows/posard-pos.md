---
description: Investigate or change POS terminal sessions, checkout, cash handling, approvals, and offline replay without weakening operational integrity.
---

# POS session workflow

1. Read `/AGENTS.md`, the current Prisma models, POS DTOs/validators, session services/actions, and relevant contract tests.
2. Trace the real path before editing: terminal selection -> session authorization -> open session -> checkout/cash movement -> close or offline review.
3. Preserve these invariants:
   - one active session per constrained user/terminal path;
   - server-side role, company, terminal, timestamp, and device validation;
   - non-negative monetary inputs and server-calculated totals;
   - traceable approval and audit records;
   - terminal-scoped pinless mode, defaulting to PIN-required;
   - idempotent checkout/offline replay and local invoice traceability;
   - offline withdrawal and close actions remain reviewable until online approval.
4. Do not trust client PIN, approval, price, stock, session, payment, or role claims. Never log raw PINs or payment details.
5. Make the smallest change in existing services/actions/components. Add a regression contract and a Playwright test when user behavior changes.
6. Run focused POS tests, `npm run verify:quick`, and the relevant browser test at 375px and desktop width.
7. Report verified behavior separately from assumptions and note any database, printer, offline, or Android checks not executed.
