-- =============================================================
-- Master Pagamentos — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- =============================================================

-- ────────────────────────────────────────
-- PROFILES
-- ────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null default 'client' check (role in ('admin', 'client')),
  status      text not null default 'active' check (status in ('active', 'blocked')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_email_idx  on public.profiles(email);
create index if not exists profiles_role_idx   on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(status);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Service role full access on profiles"
  on public.profiles
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ────────────────────────────────────────
-- FEE_PLANS
-- ────────────────────────────────────────
create table if not exists public.fee_plans (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  charged_percent  numeric(6,2) not null,
  charged_fixed    numeric(6,2) not null,
  cost_percent     numeric(6,2) not null,
  cost_fixed       numeric(6,2) not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.fee_plans enable row level security;

create policy "Authenticated users can view fee plans"
  on public.fee_plans for select
  to authenticated
  using (true);

create policy "Admins can manage fee plans"
  on public.fee_plans for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Service role full access on fee_plans"
  on public.fee_plans
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ────────────────────────────────────────
-- MERCHANTS
-- ────────────────────────────────────────
create table if not exists public.merchants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  document    text,
  type        text not null check (type in ('ecommerce', 'infoprodutor')),
  status      text not null default 'review' check (status in ('active', 'blocked', 'review')),
  plan        text references public.fee_plans(name) on update cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists merchants_status_idx on public.merchants(status);
create index if not exists merchants_type_idx   on public.merchants(type);
create index if not exists merchants_plan_idx   on public.merchants(plan);

alter table public.merchants enable row level security;

create policy "Authenticated users can view active merchants"
  on public.merchants for select
  to authenticated
  using (status = 'active');

create policy "Admins can view all merchants"
  on public.merchants for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can manage merchants"
  on public.merchants for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Service role full access on merchants"
  on public.merchants
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ────────────────────────────────────────
-- AUDIT_LOGS
-- ────────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_user_id_idx   on public.audit_logs(user_id);
create index if not exists audit_logs_entity_idx    on public.audit_logs(entity);
create index if not exists audit_logs_entity_id_idx on public.audit_logs(entity_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

create policy "Admins can view audit logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Service role full access on audit_logs"
  on public.audit_logs
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ────────────────────────────────────────
-- Trigger: auto-update updated_at
-- ────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger fee_plans_updated_at
  before update on public.fee_plans
  for each row execute procedure public.handle_updated_at();

create trigger merchants_updated_at
  before update on public.merchants
  for each row execute procedure public.handle_updated_at();
