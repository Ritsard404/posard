# POSard

POSard is a cloud point-of-sale system for small business operations. It is built with Next.js App Router, Supabase Auth, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui components, and Playwright tests.

The application covers cashier checkout, product and inventory management, role-based accounts, company and terminal administration, client-side receipt printing, X-reading/Z-reading reports, and public marketing/SEO pages.

## Contents

- [Who This Is For](#who-this-is-for)
- [System Capabilities](#system-capabilities)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Development Commands](#development-commands)
- [Application Structure](#application-structure)
- [Roles And Access](#roles-and-access)
- [Database](#database)
- [Testing And Verification](#testing-and-verification)
- [Operational Notes](#operational-notes)

## Who This Is For

This README is for developers and maintainers working on the POSard codebase. It focuses on running the app locally, understanding the main domains, and finding the files that own core POS behavior.

For end-user workflows, use the application screens directly: cashier operations live in POS, business setup lives in company/terminal screens, and operational reporting lives in dashboard/report screens.

## System Capabilities

POSard currently includes:

- Public marketing pages for `/`, `/about`, `/features`, `/solutions`, `/pricing`, `/contact`, `/privacy`, and `/terms`.
- Supabase authentication with login, password recovery, password update, and admin-approved registration requests.
- Role-based protected navigation for admin, manager, and cashier users.
- Company management with operational company records, settings, subscriptions, terminal lists, and terminal requests.
- Terminal configuration with receipt metadata, invoice numbering scoped per terminal, printer settings, and subscription status.
- Mobile-first POS checkout with menu, cart, and tender flows.
- Cash drawer sessions with opening cash, withdrawals, close-session flow, X-reading, and Z-reading support.
- Dynamic reference payment methods through `SaleType` and `EPayment`, with cash handled separately as drawer tender.
- PWD, senior, and other discount handling with customer and ID metadata.
- Product, category, inventory, stock adjustment, CSV import, and soft-delete workflows.
- Dashboard and reports for sales, invoices, payment mix, terminal activity, voids, returns, and audit activity.
- Client-side thermal printing through browser device APIs, with server-side archive storage for invoices and readings.
- Technical SEO support with sitemap, robots, Open Graph image, canonical metadata, and JSON-LD helpers.

## Technology Stack

- Framework: Next.js App Router
- UI: React, Tailwind CSS, shadcn/ui, Radix primitives, lucide-react
- Forms and validation: React Hook Form, Zod
- State: Zustand
- Charts: Recharts
- Auth and session: Supabase Auth with `@supabase/ssr`
- Database: PostgreSQL through Prisma Client and `@prisma/adapter-pg`
- Tests: Playwright
- Deployment target: Vercel

## Quick Start

Install dependencies:

```bash
npm install
```

Create `.env.local` using the variables in [Environment Variables](#environment-variables).

Generate Prisma Client:

```bash
npx prisma generate
```

Run the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

On Windows PowerShell, prefer the command shims when script execution policy blocks plain commands:

```powershell
npm.cmd install
npm.cmd run dev
npx.cmd prisma generate
```

## Environment Variables

POSard expects these variables in `.env.local` for local development and in the hosting environment for deployment.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SITE_URL=
APP_URL=
EMAIL_ENABLED=false
EMAIL_PROVIDER=noop
EMAIL_FROM=
EMAIL_REPLY_TO=
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
AI_REPORT_ENABLED=true
AI_PROVIDER=mock
OPENAI_API_KEY=
AI_REPORT_USE_MOCK_WHEN_MISSING_KEY=true
```

Variable usage:

| Variable | Used For |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server Supabase clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Auth client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-only Supabase operations such as user provisioning |
| `DATABASE_URL` | Prisma Client runtime connection |
| `DIRECT_URL` | Prisma migration datasource |
| `NEXT_PUBLIC_SITE_URL` | SEO canonical URL and public metadata base |
| `APP_URL` | Server-side base URL for provider-ready email links |
| `EMAIL_ENABLED` | Enables outbound email attempts when provider config is complete |
| `EMAIL_PROVIDER` | Email provider selector: `noop`, `resend`, or `smtp` |
| `EMAIL_FROM` | Verified sender address used by the email provider |
| `EMAIL_REPLY_TO` | Optional reply-to address for transactional email |
| `RESEND_API_KEY` | Server-only Resend API key |
| `SMTP_HOST` | SMTP server host, for Gmail use `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port, for Gmail use `587` with STARTTLS or `465` with SSL |
| `SMTP_SECURE` | Use `true` only for SSL port `465`; use `false` for Gmail port `587` |
| `SMTP_USER` | Full mailbox address used for SMTP authentication |
| `SMTP_PASSWORD` | Server-only SMTP password or Gmail app password |
| `AI_REPORT_ENABLED` | Enables the report assistant route and server action |
| `AI_PROVIDER` | Report assistant provider selector: `mock` or `openai` |
| `OPENAI_API_KEY` | Server-only OpenAI API key for live report answers |
| `AI_REPORT_USE_MOCK_WHEN_MISSING_KEY` | Keeps report assistant usable in mock mode while live keys are absent |

Do not expose `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `RESEND_API_KEY`, `SMTP_PASSWORD`, or `OPENAI_API_KEY` to client-side code.

Gmail sender setup:

1. Turn on 2-Step Verification for the POSard Gmail or Google Workspace mailbox.
2. Create a Google app password for POSard.
3. Set these server-only variables:

```env
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
EMAIL_FROM="POSard Support <your-posard-email@gmail.com>"
EMAIL_REPLY_TO=your-posard-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-posard-email@gmail.com
SMTP_PASSWORD=your-16-character-google-app-password
```

Incoming replies go to `EMAIL_REPLY_TO`, so the Gmail inbox is the receiver. Reading incoming Gmail messages inside POSard would require a separate Gmail API or IMAP integration.

## Development Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
npm run test:e2e:debug
```

The production build script runs Prisma generation before building Next.js:

```bash
prisma generate && next build
```

## Application Structure

Important top-level paths:

```text
app/
  (marketing)/       Public marketing, privacy, and terms pages
  (onboarding)/      Company setup flow
  (protected)/       Authenticated dashboard, POS, reports, companies, accounts
  auth/              Login, sign-up, password recovery, password update

components/
  ui/                Shared shadcn/ui-style primitives
  layout/            Protected layout actions and sidebar integrations
  marketing/         Public page shell components

lib/
  supabase/          Browser, server, proxy, and admin Supabase clients
  access-control*    Public route, protected route, permission, and sidebar rules
  seo.ts             Public metadata, canonical, and JSON-LD helpers
  prisma.ts          Prisma Client singleton

prisma/
  schema.prisma      Database schema
  migrations/        Database migrations

tests/
  auth/              Auth and redirect e2e tests
  product/           Product and category CRUD e2e tests
  pos/               POS responsiveness tests
```

Feature code is intentionally grouped under its route. For example, POS services, components, actions, DTOs, and store logic live under `app/(protected)/pos`.

## Roles And Access

POSard has three application roles:

| Role | Primary Scope |
| --- | --- |
| `admin` | Workspace administration, companies, terminals, subscriptions, approvals, dashboard, accounts, reports |
| `manager` | Company-scoped dashboard, POS, products, inventory, reports, accounts, company settings, terminals |
| `cashier` | POS, dashboard, transaction-facing activity, own profile |

Route access is defined in:

```text
lib/access-control-core.ts
lib/access-control.ts
lib/supabase/proxy.ts
```

When adding public pages, update the public route allowlist so unauthenticated visitors and crawlers are not redirected to login.

## Database

The Prisma schema models these main domains:

- `Profile`: Supabase user profile, role, status, company scope, PIN, and approval status.
- `Company`: Business record and owning scope for products, terminals, users, and audit logs.
- `PosTerminalInfo`: POS terminal metadata, printer configuration, counters, and invoice scope.
- `TerminalSubscription` and `TerminalRequest`: Terminal lifecycle and billing state.
- `Product`, `Category`, `Inventory`: Product catalog and stock tracking.
- `Invoice`, `Item`, `EPayment`, `SaleType`: Checkout, line items, reference payments, and receipt totals.
- `Timestamp` and `PosSession`: Cash drawer/session lifecycle.
- `InvoiceDocument`: Archived invoice, X-reading, and Z-reading payloads.
- `AuditLog` and `ApprovalLog`: Operational history and manager approval events.

Useful Prisma commands:

```bash
npx prisma generate
npx prisma migrate dev
npx prisma studio
```

Use `DIRECT_URL` for migrations and `DATABASE_URL` for runtime Prisma access.

## Testing And Verification

Run the full Playwright suite:

```bash
npm run test:e2e
```

Run focused suites when working on a specific area:

```bash
npm run test:e2e -- tests/auth
npm run test:e2e -- tests/product --workers=1
```

Run a production build before shipping structural changes:

```bash
npm run build
```

On this Windows workspace, `npm.ps1` and `npx.ps1` can be blocked by PowerShell execution policy. Use `npm.cmd` and `npx.cmd` if that happens.

## Operational Notes

- POS printing is browser/client-side because USB and Bluetooth printer access depends on the cashier device.
- Supabase and Prisma store the receipt/report data; they do not directly access local printers.
- Cash is tracked as drawer tender. Non-cash payments use dynamic `SaleType` records and reference numbers through `EPayment`.
- Invoice numbers are scoped per terminal, so different terminals can have the same invoice number sequence.
- Product inventory tracking is controlled by `Product.trackInventory`; products do not need to be stock-tracked by default.
- Company pages are operational screens. Public onboarding creates `registration_requests`, and admin approval creates the actual Auth user and profile.
- Public SEO pages must remain crawlable and should not depend on an authenticated app shell.

## Deployment

The app is designed for Vercel deployment with Supabase and PostgreSQL environment variables configured in the project.

Before deploying:

1. Confirm all required environment variables are present.
2. Run `npm run build`.
3. Verify public pages, login, protected routes, POS checkout, and report printing in the deployed environment.
4. Confirm `NEXT_PUBLIC_SITE_URL` matches the production domain used for canonical metadata.
