-- RBAC setup for Profiles table
-- Run this in Supabase SQL editor (not Prisma) or using psql to your Supabase DB.

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

-- We recommend adding RLS policies to restrict who can read/update.
alter table profiles enable row level security;

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

-- Drop existing policies if they exist
drop policy if exists "app_full_access_admin" on profiles;
drop policy if exists "users_can_read_own" on profiles;
drop policy if exists "admins_can_update_status" on profiles;
drop policy if exists "users_can_insert_self" on profiles;

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

create policy "users_can_insert_self" on profiles
  for insert
  with check (user_id = auth.uid() and role = 'manager' and status = 'pending');
