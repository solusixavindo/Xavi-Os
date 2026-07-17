begin;

create extension if not exists pgcrypto with schema extensions;

create type public.membership_level as enum ('basic', 'pro', 'premium', 'platinum');
create type public.profile_role as enum ('member', 'admin');
create type public.kyc_status as enum ('unverified', 'pending', 'verified', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  avatar_url text,
  referral_code text not null,
  referred_by uuid references public.profiles (id) on delete restrict,
  membership public.membership_level not null default 'basic',
  xavi_points bigint not null default 0,
  role public.profile_role not null default 'member',
  kyc_status public.kyc_status not null default 'unverified',
  email_verified_at timestamptz,
  terms_accepted_at timestamptz not null,
  terms_version text not null,
  privacy_version text not null,
  onboarding_completed boolean not null default false,
  upgrade_intent public.membership_level,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_unique unique (email),
  constraint profiles_phone_unique unique (phone),
  constraint profiles_referral_code_unique unique (referral_code),
  constraint profiles_email_lowercase check (email = lower(email)),
  constraint profiles_email_format check (
    length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint profiles_full_name_length check (length(full_name) <= 120),
  constraint profiles_phone_format check (phone is null or phone ~ '^\+?[0-9]{8,15}$'),
  constraint profiles_avatar_url check (
    avatar_url is null
    or (length(avatar_url) <= 2048 and avatar_url ~ '^https://')
  ),
  constraint profiles_referral_code_format check (referral_code ~ '^X[A-Z0-9]{11}$'),
  constraint profiles_not_self_referred check (referred_by is null or referred_by <> id),
  constraint profiles_points_nonnegative check (xavi_points >= 0),
  constraint profiles_legal_version_format check (
    terms_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    and privacy_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ),
  constraint profiles_upgrade_intent_paid_only check (upgrade_intent is null or upgrade_intent <> 'basic')
);

create index profiles_referred_by_idx on public.profiles (referred_by) where referred_by is not null;
create index profiles_membership_idx on public.profiles (membership);
create index profiles_onboarding_idx on public.profiles (onboarding_completed) where onboarding_completed = false;

create or replace function public.make_referral_code(p_user_id uuid, p_attempt integer default 0)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select 'X' || upper(substr(encode(extensions.digest(p_user_id::text || ':' || p_attempt::text, 'sha256'), 'hex'), 1, 11));
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt integer := 0;
  v_constraint text;
  v_email text := lower(btrim(coalesce(new.email, '')));
  v_full_name text := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120);
  v_phone text := regexp_replace(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '[[:space:]().-]', '', 'g');
  v_referral_input text := upper(btrim(coalesce(new.raw_user_meta_data ->> 'referral_code_input', '')));
  v_referral_code text;
  v_referrer uuid;
  v_inserted integer;
  v_terms_version text := btrim(coalesce(new.raw_user_meta_data ->> 'terms_version', ''));
  v_privacy_version text := btrim(coalesce(new.raw_user_meta_data ->> 'privacy_version', ''));
begin
  if v_email = '' then
    raise exception using errcode = '23514', message = 'email_required';
  end if;

  if lower(coalesce(new.raw_user_meta_data ->> 'terms_accepted', 'false')) <> 'true'
    or v_terms_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or v_privacy_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception using errcode = '23514', message = 'terms_acceptance_required';
  end if;

  if v_phone !~ '^\+?[0-9]{8,15}$' then
    raise exception using errcode = '23514', message = 'invalid_phone';
  end if;

  if v_referral_input !~ '^X[A-Z0-9]{11}$' then
    v_referral_input := '';
  end if;

  loop
    v_referral_code := public.make_referral_code(new.id, v_attempt);
    v_referrer := null;

    -- An input matching the user's own deterministic code is explicitly rejected.
    if v_referral_input <> '' and v_referral_input <> v_referral_code then
      select p.id into v_referrer
      from public.profiles as p
      where p.referral_code = v_referral_input;
    end if;

    begin
      insert into public.profiles (
        id,
        email,
        full_name,
        phone,
        referral_code,
        referred_by,
        membership,
        xavi_points,
        role,
        kyc_status,
        email_verified_at,
        terms_accepted_at,
        terms_version,
        privacy_version
      )
      values (
        new.id,
        v_email,
        v_full_name,
        v_phone,
        v_referral_code,
        v_referrer,
        'basic',
        0,
        'member',
        'unverified',
        new.email_confirmed_at,
        now(),
        v_terms_version,
        v_privacy_version
      )
      on conflict (id) do nothing;

      get diagnostics v_inserted = row_count;
      if v_inserted = 1 or exists (select 1 from public.profiles where id = new.id) then
        exit;
      end if;
    exception
      when unique_violation then
        get stacked diagnostics v_constraint = constraint_name;
        if v_constraint = 'profiles_phone_unique' then
          raise exception using errcode = '23505', message = 'phone_already_registered';
        elsif v_constraint <> 'profiles_referral_code_unique' then
          raise;
        end if;
    end;

    v_attempt := v_attempt + 1;
    if v_attempt >= 10 then
      raise exception using errcode = '23505', message = 'unable_to_allocate_referral_code';
    end if;
  end loop;

  return new;
end;
$$;

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    email = lower(new.email),
    email_verified_at = new.email_confirmed_at
  where id = new.id;
  return new;
end;
$$;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

create or replace function public.protect_profile_attribution()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.referral_code is distinct from old.referral_code
    or new.referred_by is distinct from old.referred_by
    or new.terms_accepted_at is distinct from old.terms_accepted_at
    or new.terms_version is distinct from old.terms_version
    or new.privacy_version is distinct from old.privacy_version
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '42501', message = 'profile_attribution_is_immutable';
  end if;
  return new;
end;
$$;

create or replace function public.update_my_profile(
  p_full_name text,
  p_phone text,
  p_avatar_url text default null,
  p_onboarding_completed boolean default false,
  p_upgrade_intent public.membership_level default null
)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_full_name text := btrim(coalesce(p_full_name, ''));
  v_phone text := regexp_replace(btrim(coalesce(p_phone, '')), '[[:space:]().-]', '', 'g');
  v_avatar_url text := nullif(btrim(coalesce(p_avatar_url, '')), '');
  v_upgrade_intent public.membership_level := p_upgrade_intent;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if length(v_full_name) < 2 or length(v_full_name) > 120 then
    raise exception using errcode = '23514', message = 'invalid_full_name';
  end if;
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    raise exception using errcode = '23514', message = 'invalid_phone';
  end if;
  if v_avatar_url is not null and (length(v_avatar_url) > 2048 or v_avatar_url !~ '^https://') then
    raise exception using errcode = '23514', message = 'invalid_avatar_url';
  end if;
  if v_upgrade_intent = 'basic' then
    v_upgrade_intent := null;
  end if;
  if p_onboarding_completed and (v_full_name = '' or v_phone = '') then
    raise exception using errcode = '23514', message = 'incomplete_onboarding';
  end if;

  return query
  update public.profiles
  set
    full_name = v_full_name,
    phone = v_phone,
    avatar_url = v_avatar_url,
    onboarding_completed = p_onboarding_completed,
    upgrade_intent = v_upgrade_intent
  where id = v_user_id
  returning *;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create trigger on_auth_user_email_changed
after update of email, email_confirmed_at on auth.users
for each row
when (old.email is distinct from new.email or old.email_confirmed_at is distinct from new.email_confirmed_at)
execute function public.sync_auth_user_profile();

create trigger protect_profile_attribution_before_update
before update on public.profiles
for each row execute function public.protect_profile_attribution();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

revoke usage on type public.membership_level, public.profile_role, public.kyc_status from anon;
grant usage on type public.membership_level, public.profile_role, public.kyc_status to authenticated;

revoke execute on function public.make_referral_code(uuid, integer) from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.sync_auth_user_profile() from public, anon, authenticated;
revoke execute on function public.set_profile_updated_at() from public, anon, authenticated;
revoke execute on function public.protect_profile_attribution() from public, anon, authenticated;
revoke execute on function public.update_my_profile(text, text, text, boolean, public.membership_level) from public, anon;
grant execute on function public.update_my_profile(text, text, text, boolean, public.membership_level) to authenticated;

comment on table public.profiles is 'Private identity profile. Privileged membership, points, role, KYC, and referral attribution are server-managed.';
comment on function public.update_my_profile(text, text, text, boolean, public.membership_level) is 'Authenticated allowlist update for non-privileged profile fields and non-binding membership upgrade intent.';

commit;
