-- XAVI-OS MVP schema for a new Supabase project.
-- Run only after reviewing in a non-production Supabase project.
create extension if not exists pgcrypto;

create type public.membership_level as enum ('basic','pro','premium','platinum');
create type public.ledger_status as enum ('pending','available','paid','reversed');
create type public.order_status as enum ('draft','pending_payment','paid','processing','completed','cancelled','refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  referral_code text unique not null,
  referred_by uuid references public.profiles(id),
  membership public.membership_level not null default 'basic',
  xavi_points bigint not null default 0 check (xavi_points >= 0),
  created_at timestamptz not null default now()
);

create table public.business_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null,
  industry text not null,
  slug text unique not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_workspace_id uuid references public.business_workspaces(id),
  name text not null,
  description text,
  product_type text not null,
  price_amount bigint not null check (price_amount >= 0),
  currency text not null default 'IDR',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  status public.order_status not null default 'draft',
  subtotal bigint not null check (subtotal >= 0),
  discount bigint not null default 0 check (discount >= 0),
  service_fee bigint not null default 0 check (service_fee >= 0),
  total bigint not null check (total >= 0),
  payment_provider text,
  payment_reference text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null default 1 check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0)
);

create table public.referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id),
  referred_id uuid not null references public.profiles(id),
  event_type text not null,
  order_id uuid references public.orders(id),
  created_at timestamptz not null default now(),
  unique(referred_id, event_type, order_id)
);

create table public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  beneficiary_id uuid not null references public.profiles(id),
  source_order_id uuid not null references public.orders(id),
  amount bigint not null check (amount >= 0),
  rate numeric(5,2) not null check (rate >= 0 and rate <= 100),
  status public.ledger_status not null default 'pending',
  available_at timestamptz,
  created_at timestamptz not null default now(),
  unique(beneficiary_id, source_order_id)
);

create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  amount bigint not null check (amount >= 100000),
  status text not null default 'requested',
  destination jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.business_workspaces enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.referral_events enable row level security;
alter table public.commission_ledger enable row level security;
alter table public.withdrawal_requests enable row level security;

create policy "profile self read" on public.profiles for select using (auth.uid() = id);
create policy "profile self update" on public.profiles for update using (auth.uid() = id);
create policy "workspace owner access" on public.business_workspaces for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "active products public read" on public.products for select using (active = true);
create policy "buyer orders" on public.orders for select using (auth.uid() = buyer_id);
create policy "buyer creates draft" on public.orders for insert with check (auth.uid() = buyer_id and status = 'draft');
create policy "own commissions" on public.commission_ledger for select using (auth.uid() = beneficiary_id);
create policy "own withdrawals" on public.withdrawal_requests for select using (auth.uid() = user_id);
create policy "request own withdrawal" on public.withdrawal_requests for insert with check (auth.uid() = user_id and status = 'requested');

-- Payment confirmation and commission creation must be performed by a trusted
-- server/Edge Function using provider webhooks, never directly by the app.
