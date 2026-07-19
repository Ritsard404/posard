---
trigger: always_on
---

# POSard repository rule

Read and follow `/AGENTS.md` before changing this repository. Nested `AGENTS.md` files add rules for Prisma migrations and offline sync endpoints.

Core requirements:

- Inspect before editing and preserve unrelated work.
- Reuse existing feature services, DTOs, validators, actions, and components.
- Verify schema and contracts instead of guessing.
- Keep authentication, authorization, tenant scoping, offline idempotency, and migration history intact.
- Never expose secrets or raw internal errors.
- Run the risk-appropriate commands from the root verification matrix and report actual results.

The root file is authoritative when older skill or workflow text conflicts with it.
