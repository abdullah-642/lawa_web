-- ============================================================
-- LIWA CRM — Supabase Database Schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable pgcrypto for password hashing (optional for now, used by RPC)
create extension if not exists pgcrypto;

-- ============================================================
-- TABLES (ids are text to match the app's "id_xxxx" format)
-- ============================================================

create table if not exists public.app_users (
  id           text primary key,
  username     text unique not null,
  password     text not null,
  name         text not null,
  role         text default 'Admin',
  title        text,
  salary       numeric default 0,
  permissions  jsonb default '[]'::jsonb,
  date         timestamptz default now(),
  created_at   timestamptz default now()
);
-- Add new columns if upgrading from old schema
alter table public.app_users add column if not exists title text;
alter table public.app_users add column if not exists salary numeric default 0;
alter table public.app_users add column if not exists permissions jsonb default '[]'::jsonb;
alter table public.app_users add column if not exists date timestamptz default now();

create table if not exists public.invoices (
  id            text primary key,
  number        text not null,
  "customerId"  text,
  "customerName" text,
  items         jsonb default '[]'::jsonb,
  subtotal      numeric default 0,
  vat           numeric default 0,
  total         numeric default 0,
  status        text default 'draft',
  "dueDate"     date,
  notes         text,
  date          timestamptz default now()
);

create table if not exists public.employees (
  id           text primary key,
  name         text not null,
  title        text not null,
  phone        text,
  email        text,
  salary       numeric default 0,
  "startDate"  date,
  notes        text,
  date         timestamptz default now()
);

alter table public.invoices enable row level security;
alter table public.employees enable row level security;
drop policy if exists "anon all invoices" on public.invoices;
create policy "anon all invoices" on public.invoices for all using (true) with check (true);
drop policy if exists "anon all employees" on public.employees;
create policy "anon all employees" on public.employees for all using (true) with check (true);

create table if not exists public.requests (
  id          text primary key,
  name        text not null,
  phone       text,
  type        text,
  message     text,
  status      text default 'new',
  source      text default 'website',
  date        timestamptz default now()
);

create table if not exists public.customers (
  id          text primary key,
  name        text not null,
  phone       text,
  email       text,
  source      text,
  "requestId" text,
  date        timestamptz default now()
);

create table if not exists public.projects (
  id          text primary key,
  name        text not null,
  "customerId" text,
  type        text,
  value       numeric default 0,
  progress    integer default 0,
  status      text default 'discovery',
  date        timestamptz default now()
);

create table if not exists public.quotes (
  id          text primary key,
  number      text not null,
  "customerId" text,
  total       numeric default 0,
  status      text default 'draft',
  notes       text,
  date        timestamptz default now()
);

create table if not exists public.tasks (
  id          text primary key,
  title       text not null,
  "dueDate"   date,
  status      text default 'pending',
  date        timestamptz default now()
);

create table if not exists public.settings (
  id            integer primary key default 1,
  "companyName"  text default 'لواء كونسبت',
  "companyEmail" text default 'info@liwa1.com',
  "companyPhone" text default '0544668836',
  whatsapp      text default '966544668836',
  updated_at    timestamptz default now(),
  constraint settings_singleton check (id = 1)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_requests_date on public.requests (date desc);
create index if not exists idx_requests_status on public.requests (status);
create index if not exists idx_customers_date on public.customers (date desc);
create index if not exists idx_projects_status on public.projects (status);

-- ============================================================
-- SEED DEFAULTS
-- ============================================================

-- Default admin user (username: admin, password: Liwa@2026)
insert into public.app_users (id, username, password, name, role)
values ('u_admin', 'admin', 'Liwa@2026', 'المسؤول', 'Admin')
on conflict (username) do nothing;

-- Default settings row
insert into public.settings (id) values (1)
on conflict (id) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- For an internal CRM accessed only by trusted staff, we allow
-- the anon role to perform all operations. For production with
-- public users, you should tighten these policies.
-- ============================================================

-- Enable RLS on all tables
alter table public.app_users enable row level security;
alter table public.requests enable row level security;
alter table public.customers enable row level security;
alter table public.projects enable row level security;
alter table public.quotes enable row level security;
alter table public.tasks enable row level security;
alter table public.settings enable row level security;

-- requests: anyone can INSERT (form submissions from public site),
-- only "authenticated app users" can READ/UPDATE/DELETE.
-- For simplicity here we allow anon to do all (since auth is custom).
drop policy if exists "anon all requests" on public.requests;
create policy "anon all requests" on public.requests
  for all using (true) with check (true);

drop policy if exists "anon all customers" on public.customers;
create policy "anon all customers" on public.customers
  for all using (true) with check (true);

drop policy if exists "anon all projects" on public.projects;
create policy "anon all projects" on public.projects
  for all using (true) with check (true);

drop policy if exists "anon all quotes" on public.quotes;
create policy "anon all quotes" on public.quotes
  for all using (true) with check (true);

drop policy if exists "anon all tasks" on public.tasks;
create policy "anon all tasks" on public.tasks
  for all using (true) with check (true);

drop policy if exists "anon all settings" on public.settings;
create policy "anon all settings" on public.settings
  for all using (true) with check (true);

-- app_users: anon CANNOT read passwords. Only the verify_login RPC can read.
-- (No SELECT policy means anon can't read directly.)
-- Allow INSERT for first-time admin creation if needed (optional):
drop policy if exists "anon insert app_users" on public.app_users;
-- (commented out for safety; uncomment if you want signup)
-- create policy "anon insert app_users" on public.app_users
--   for insert with check (true);

-- ============================================================
-- AUTH RPC: verify_login(username, password) → user JSON or null
-- security definer bypasses RLS so we can check the password.
-- ============================================================
create or replace function public.verify_login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  select id, username, name, role
    into v_user
    from public.app_users
   where username = p_username
     and password = p_password
   limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id',       v_user.id,
    'username', v_user.username,
    'name',     v_user.name,
    'role',     v_user.role
  );
end;
$$;

grant execute on function public.verify_login(text, text) to anon;
grant execute on function public.verify_login(text, text) to authenticated;

-- ============================================================
-- CHANGE PASSWORD RPC
-- ============================================================
create or replace function public.change_password(p_user_id text, p_old_password text, p_new_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.app_users
     set password = p_new_password
   where id = p_user_id
     and password = p_old_password;

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

grant execute on function public.change_password(text, text, text) to anon;
grant execute on function public.change_password(text, text, text) to authenticated;
