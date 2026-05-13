-- RBAC setup for Profiles table
-- Run this in Supabase SQL editor (not Prisma) after Prisma migrations.
-- Prisma owns the full schema; this file owns Supabase RLS/profile bootstrap helpers.

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'disabled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE registration_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  email text not null,
  role user_role not null default 'manager',
  status user_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (email)
);

create table if not exists registration_requests (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text not null,
  phone text,
  company_name text,
  requested_role user_role not null default 'manager',
  status registration_request_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_display_state (
  uuid_customer_display_state uuid default gen_random_uuid() primary key,
  terminal_id uuid not null unique references public.pos_terminal_info(uuid_pos_terminal) on delete cascade,
  company_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_display_state_company_id_idx
  on public.customer_display_state(company_id);

create index if not exists customer_display_state_terminal_id_updated_at_idx
  on public.customer_display_state(terminal_id, updated_at);

-- We recommend adding RLS policies to restrict who can read/update.
alter table profiles enable row level security;
alter table registration_requests enable row level security;
alter table customer_display_state enable row level security;

-- Function to check if user is admin, security definer to avoid RLS recursion
create or replace function is_admin(user_id uuid)
returns boolean
security definer
as $$
  select exists (
    select 1 from profiles
    where profiles.user_id = $1 and role = 'admin' and status = 'active'
  );
$$ language sql;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Drop existing policies if they exist
drop policy if exists "app_full_access_admin" on profiles;
drop policy if exists "users_can_read_own" on profiles;
drop policy if exists "admins_can_update_status" on profiles;
drop policy if exists "users_can_insert_self" on profiles;
drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "admins_can_read_registration_requests" on registration_requests;
drop policy if exists "admins_can_update_registration_requests" on registration_requests;
drop policy if exists "public_can_insert_registration_requests" on registration_requests;
drop policy if exists "customer_display_company_read" on customer_display_state;

create policy "app_full_access_admin" on profiles
  for all
  using (is_admin(auth.uid()));

create policy "users_can_read_own" on profiles
  for select
  using (user_id = auth.uid());

create policy "admins_can_update_status" on profiles
  for update
  using (is_admin(auth.uid()))
  with check (status in ('pending', 'active', 'disabled'));

create policy "public_can_insert_registration_requests" on registration_requests
  for insert
  to anon, authenticated
  with check (
    requested_role = 'manager'
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
  );

create policy "admins_can_read_registration_requests" on registration_requests
  for select
  to authenticated
  using (is_admin(auth.uid()));

create policy "admins_can_update_registration_requests" on registration_requests
  for update
  to authenticated
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create policy "customer_display_company_read" on customer_display_state
  for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.status = 'active'
        and (
          profiles.role = 'admin'
          or profiles.company_id = customer_display_state.company_id
        )
    )
  );

-- Explicit Data API privileges.
-- Supabase Auth maps unauthenticated requests to anon, signed-in users to authenticated,
-- and server-side service keys to service_role. RLS policies above still decide which
-- rows each role can access.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Profile lookup is only needed by authenticated app users and server-side admin code.
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- Public onboarding may insert pending requests; only admins may read/update through RLS.
GRANT INSERT ON public.registration_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.registration_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_requests TO service_role;

-- Customer display subscribers read state through Supabase Realtime/Postgres changes.
GRANT SELECT ON public.customer_display_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_display_state TO service_role;

-- Keep helper function execution explicit for Supabase Data API roles.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- Do not grant anon/authenticated access to the rest of POSard's Prisma tables here.
-- Checkout, reports, inventory, accounts, and admin workflows should continue through
-- server routes/actions backed by Prisma, not direct browser table access.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_display_state;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
