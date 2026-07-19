# Offline sync endpoint instructions

These rules extend the root `AGENTS.md` for `app/api/sync/**`.

- Authenticate with Supabase and reload the current profile on the server. Enforce company, cashier, terminal, timestamp, and device ownership for every action.
- Parse bounded payloads with the existing security helpers and Zod schemas before processing.
- Preserve client action order and idempotency. A retry must not duplicate invoices, payments, cash movements, inventory effects, or audit records.
- Treat offline approvals as untrusted. Cash withdrawal and session close remain reviewable until an online authorization path confirms them.
- Return sanitized action-level outcomes: `synced`, `failed`, or `needs_review`. Persist unresolved issues so Sync Center can recover them.
- Do not remove local invoice numbers, idempotency keys, retry metadata, or device identifiers from contracts without a migration/compatibility plan.
- Avoid logging full queued payloads, payment details, PINs, or customer data. Keep operational metrics aggregate and correlation-friendly.
- Required checks: focused sync/business-integrity Node tests, `npm run verify:quick`, and Playwright `tests/pos/local-first-sync.spec.ts` when runtime behavior changes.
