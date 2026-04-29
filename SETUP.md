# POSard Setup Guide

This guide sets up POSard for local development with Supabase Auth, Supabase PostgreSQL, Prisma migrations, and the RBAC SQL in `supabase-rbac.sql`.

## Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project
- Access to the Supabase SQL Editor
- The Supabase database connection strings

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if `npm` or `npx` is blocked by execution policy.

## Setup Order

Follow this order for a clean setup:

1. Create or open a Supabase project.
2. Configure Supabase Auth.
3. Add local environment variables.
4. Install dependencies.
5. Run Prisma migrations.
6. Run `supabase-rbac.sql` in Supabase SQL Editor.
7. Bootstrap the first admin profile.
8. Run the app and verify access.

## 1. Create A Supabase Project

In Supabase:

1. Create a project or open the existing POSard project.
2. Go to **Project Settings > API**.
3. Copy:
   - Project URL
   - Publishable key
   - Service role key
4. Go to **Project Settings > Database**.
5. Copy:
   - Pooled connection string for app runtime
   - Direct connection string for Prisma migrations

Use the pooled connection string for `DATABASE_URL` and the direct connection string for `DIRECT_URL`.

## 2. Configure Supabase Auth

In **Authentication > Providers**:

1. Enable Email provider.
2. Enable password-based sign-in.
3. Decide whether email confirmation is required for your environment.

In **Authentication > URL Configuration**:

1. Set **Site URL** for local development:

   ```text
   http://localhost:3000
   ```

2. Add local redirect URLs:

   ```text
   http://localhost:3000/auth/login
   http://localhost:3000/auth/update-password
   http://localhost:3000/auth/confirm
   ```

3. For production, also add the deployed Vercel URLs, for example:

   ```text
   https://posard.vercel.app/auth/login
   https://posard.vercel.app/auth/update-password
   https://posard.vercel.app/auth/confirm
   ```

POSard uses Supabase Auth for sign-in, password reset, user invites, and admin-managed account creation.

## 3. Configure Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Variable usage:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by browser and server clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase key for browser/server auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key for creating, inviting, updating, and deleting users |
| `DATABASE_URL` | Runtime Prisma connection string, usually pooled |
| `DIRECT_URL` | Direct database connection string used by Prisma migrations |
| `NEXT_PUBLIC_SITE_URL` | Public canonical URL for SEO metadata |
| `NEXT_PUBLIC_APP_URL` | Base URL used for account invite redirects |

Keep `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and `DIRECT_URL` server-only. Do not expose them in client components.

## 4. Install Dependencies

```bash
npm install
```

Windows PowerShell:

```powershell
npm.cmd install
```

## 5. Run Prisma Migrations

Generate Prisma Client:

```bash
npx prisma generate
```

Apply migrations to Supabase:

```bash
npx prisma migrate deploy
```

For local migration development, use:

```bash
npx prisma migrate dev
```

Windows PowerShell:

```powershell
npx.cmd prisma generate
npx.cmd prisma migrate deploy
```

Prisma owns the POSard database schema. The migrations create the main application tables, enums, indexes, and foreign keys.

## 6. Run Supabase RBAC SQL

After Prisma migrations complete, run the RBAC SQL. Do not run this before the Prisma migrations on a fresh database, because Prisma owns the full schema and migration history.

1. Open Supabase Dashboard.
2. Go to **SQL Editor**.
3. Open the local file `supabase-rbac.sql`.
4. Copy the SQL into the Supabase SQL Editor.
5. Run it.

The SQL file does these Supabase-specific tasks:

- Ensures the `user_role` and `user_status` enum types exist.
- Ensures the `registration_request_status` enum type exists.
- Ensures the `profiles` table exists for Supabase Auth profile lookup.
- Ensures the `registration_requests` table exists for public onboarding requests.
- Enables row-level security on `public.profiles`.
- Enables row-level security on `public.registration_requests`.
- Creates the `is_admin(user_id uuid)` helper function.
- Creates policies that allow active admins to manage profiles.
- Allows authenticated users to read their own profile.
- Allows public users to insert pending registration requests without exposing read access.
- Allows active admins to read and update registration requests.
- Grants public schema usage and authenticated profile read access.

Important: `supabase-rbac.sql` is for Supabase security setup. Prisma migrations remain the source of truth for the full application schema.

## 7. Bootstrap The First Admin

The first admin must exist before admin-only workflows can approve managers or manage companies.

In Supabase:

1. Go to **Authentication > Users**.
2. Create the first admin user or invite the admin email.
3. Copy the new user's Auth user ID.
4. Go to **SQL Editor**.
5. Insert or update the matching profile:

```sql
insert into public.profiles (user_id, email, full_name, role, status, approved_at)
values (
  'AUTH_USER_ID_HERE',
  'admin@example.com',
  'POSard Admin',
  'admin',
  'active',
  now()
)
on conflict (user_id)
do update set
  email = excluded.email,
  full_name = excluded.full_name,
  role = 'admin',
  status = 'active',
  approved_at = coalesce(public.profiles.approved_at, now()),
  updated_at = now();
```

Replace `AUTH_USER_ID_HERE` and `admin@example.com` with the real Supabase Auth user values.

## 8. Run The App

```bash
npm run dev
```

Windows PowerShell:

```powershell
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

Sign in at:

```text
http://localhost:3000/auth/login
```

## Account Flow

POSard uses these account paths:

| Flow | What Happens |
| --- | --- |
| Public sign-up | Creates a `registration_requests` row only; no Supabase Auth user is created yet |
| Admin approval | Admin reviews the request, creates the Supabase Auth user server-side with an initial password, creates the matching active profile, and shares the credentials manually when email delivery is not available |
| Manager onboarding | Approved managers without a company are sent to `/setup-company` |
| Company setup | Creates the company, assigns the manager, creates the first terminal, and saves the manager PIN |
| Cashier creation | Manager/admin creates cashier accounts from Accounts; cashier users are active after creation |
| Password reset | Supabase sends reset link to `/auth/update-password` |

## Role Access

| Area | Admin | Manager | Cashier |
| --- | --- | --- | --- |
| Dashboard | Yes | Yes | Yes |
| POS | No | Yes | Yes |
| Products and inventory | No | Yes | No |
| Reports | Yes | Yes | No |
| Accounts | Yes | Yes | Own profile only |
| Companies | Yes | Own company screens | No |
| Terminals | Yes | Own company terminals | No |
| Approvals | Yes | No | No |

Route and navigation access is controlled by:

```text
lib/access-control-core.ts
lib/access-control.ts
lib/supabase/proxy.ts
```

## Database Setup Checklist

Use this checklist when preparing a fresh Supabase database:

1. `DATABASE_URL` points to the pooled Supabase database connection.
2. `DIRECT_URL` points to the direct Supabase database connection.
3. `npx prisma generate` completes.
4. `npx prisma migrate deploy` completes.
5. `supabase-rbac.sql` has been run in Supabase SQL Editor.
6. `public.profiles` has RLS enabled.
7. `is_admin(uuid)` exists under `public`.
8. The first admin Auth user exists.
9. The first admin `public.profiles` row has `role = 'admin'` and `status = 'active'`.
10. A login test reaches `/dashboard`.

## Verification Commands

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

End-to-end tests:

```bash
npm run test:e2e
```

Focused test examples:

```bash
npm run test:e2e -- tests/auth
npm run test:e2e -- tests/product --workers=1
```

## Troubleshooting

### Login says profile was not found

The Supabase Auth user exists, but `public.profiles` does not have a matching `user_id`.

Fix:

1. Confirm `supabase-rbac.sql` has been run.
2. Create or update the profile row for the user.
3. Make sure the profile status is `active` for users who should log in.

### Account is pending approval

The user submitted a registration request, but an admin has not approved it yet.

Fix:

1. Sign in as an active admin.
2. Open the approvals workflow.
3. Approve the pending registration request so the Auth user and active profile are created.

For the first admin, update the row manually in SQL as shown in [Bootstrap The First Admin](#7-bootstrap-the-first-admin).

### Manager redirects to setup company

The manager is active but has no `company_id`.

Fix:

1. Let the manager complete `/setup-company`.
2. Or assign the manager to an existing company through the admin/account workflow.

### Prisma cannot connect

Check:

1. `DATABASE_URL` is present.
2. `DIRECT_URL` is present.
3. The database password is URL-encoded if it contains special characters.
4. Supabase database connection pooling settings match the connection string.

### Supabase admin actions fail

Check:

1. `SUPABASE_SERVICE_ROLE_KEY` is present.
2. The key is the service role key, not the publishable key.
3. The code path is server-side only.

### PowerShell blocks npm or npx

Use the Windows command shims:

```powershell
npm.cmd run dev
npm.cmd run build
npx.cmd prisma generate
```

## Deployment Notes

For Vercel:

1. Add all variables from `.env.local` to Vercel project environment variables.
2. Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` to the production domain.
3. Add production auth redirect URLs in Supabase.
4. Run Prisma migrations against the production Supabase database.
5. Run `supabase-rbac.sql` in the production Supabase SQL Editor.
6. Confirm the first admin profile exists and is active.
7. Deploy and verify login, dashboard, POS checkout, reports, and public SEO pages.
