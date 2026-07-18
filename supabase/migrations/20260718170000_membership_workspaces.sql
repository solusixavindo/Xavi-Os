begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create type public.entitlement_value_kind as enum ('boolean', 'integer');
create type public.subscription_status as enum ('pending', 'active', 'past_due', 'cancelled', 'expired', 'revoked');
create type public.workspace_kind as enum ('personal', 'business');
create type public.workspace_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.access_audit_event_type as enum (
  'entitlement_configuration_changed',
  'subscription_lifecycle_changed',
  'membership_projection_changed',
  'personal_workspace_provisioned',
  'business_workspace_created',
  'workspace_updated',
  'workspace_archived',
  'workspace_member_role_changed',
  'workspace_member_removed'
);

create table public.membership_plans (
  code public.membership_level primary key,
  display_name text not null unique,
  is_paid boolean not null,
  is_active boolean not null default true,
  sort_order smallint not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_plans_display_name_format check (
    display_name = btrim(display_name) and length(display_name) between 3 and 32
  ),
  constraint membership_plans_sort_order_positive check (sort_order > 0),
  constraint membership_plans_paid_consistency check (
    (code = 'basic' and not is_paid) or (code <> 'basic' and is_paid)
  )
);

create table public.entitlement_definitions (
  key text primary key,
  value_kind public.entitlement_value_kind not null,
  description text not null,
  is_security_relevant boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlement_definitions_key_format check (key ~ '^[a-z][a-z0-9_]{2,63}$'),
  constraint entitlement_definitions_description_length check (
    description = btrim(description) and length(description) between 3 and 240
  )
);

create table public.plan_entitlements (
  plan_code public.membership_level not null references public.membership_plans (code) on update cascade on delete restrict,
  entitlement_key text not null references public.entitlement_definitions (key) on update cascade on delete restrict,
  boolean_value boolean,
  integer_value integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_code, entitlement_key),
  constraint plan_entitlements_one_value check (
    (boolean_value is not null and integer_value is null)
    or (boolean_value is null and integer_value is not null)
  ),
  constraint plan_entitlements_integer_nonnegative check (integer_value is null or integer_value >= 0)
);

create table public.subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_code public.membership_level not null references public.membership_plans (code) on update cascade on delete restrict,
  status public.subscription_status not null default 'pending',
  period_start timestamptz,
  period_end timestamptz,
  activated_at timestamptz,
  cancelled_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_paid_plan_only check (plan_code <> 'basic'),
  constraint subscriptions_period_order check (
    period_end is null or (period_start is not null and period_end > period_start)
  ),
  constraint subscriptions_active_fields check (
    status <> 'active' or (period_start is not null and activated_at is not null)
  ),
  constraint subscriptions_cancelled_timestamp check (status <> 'cancelled' or cancelled_at is not null),
  constraint subscriptions_ended_timestamp check (status not in ('expired', 'revoked') or ended_at is not null)
);

create unique index subscriptions_one_active_per_user_idx
on public.subscriptions (user_id)
where status = 'active';
create index subscriptions_user_history_idx on public.subscriptions (user_id, created_at desc);
create index subscriptions_active_period_idx on public.subscriptions (period_end) where status = 'active';

create table public.workspaces (
  id uuid primary key default extensions.gen_random_uuid(),
  kind public.workspace_kind not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  archived_at timestamptz,
  archived_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_name_format check (
    name = btrim(name) and length(name) between 2 and 80
  ),
  constraint workspaces_slug_format check (
    length(slug) between 3 and 48
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint workspaces_archive_actor check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  )
);

create unique index workspaces_slug_unique_idx on public.workspaces (slug);
create unique index workspaces_one_personal_per_owner_idx
on public.workspaces (owner_id)
where kind = 'personal';
create index workspaces_owner_active_idx on public.workspaces (owner_id, kind) where archived_at is null;

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id, workspace_id);

create table public.access_audit_events (
  id bigint generated always as identity primary key,
  event_type public.access_audit_event_type not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  subject_user_id uuid references auth.users (id) on delete set null,
  workspace_id uuid references public.workspaces (id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint access_audit_events_details_object check (jsonb_typeof(details) = 'object')
);

create index access_audit_events_workspace_idx on public.access_audit_events (workspace_id, created_at desc)
where workspace_id is not null;
create index access_audit_events_subject_idx on public.access_audit_events (subject_user_id, created_at desc)
where subject_user_id is not null;

insert into public.membership_plans (code, display_name, is_paid, sort_order)
values
  ('basic', 'Basic', false, 10),
  ('pro', 'Pro', true, 20),
  ('premium', 'Premium', true, 30),
  ('platinum', 'Platinum', true, 40);

insert into public.entitlement_definitions (key, value_kind, description)
values
  ('personal_workspace', 'boolean', 'May provision and access one Personal Workspace.'),
  ('business_workspace', 'boolean', 'May create and access Business Workspaces.'),
  ('business_workspace_limit', 'integer', 'Maximum number of active owned Business Workspaces.');

insert into public.plan_entitlements (plan_code, entitlement_key, boolean_value, integer_value)
values
  ('basic', 'personal_workspace', true, null),
  ('basic', 'business_workspace', false, null),
  ('basic', 'business_workspace_limit', null, 0),
  ('pro', 'personal_workspace', true, null),
  ('pro', 'business_workspace', true, null),
  ('pro', 'business_workspace_limit', null, 1),
  ('premium', 'personal_workspace', true, null),
  ('premium', 'business_workspace', true, null),
  ('premium', 'business_workspace_limit', null, 3),
  ('platinum', 'personal_workspace', true, null),
  ('platinum', 'business_workspace', true, null),
  ('platinum', 'business_workspace_limit', null, 10);

create or replace function private.set_access_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

create or replace function private.validate_plan_entitlement_value()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_kind public.entitlement_value_kind;
begin
  select d.value_kind into strict v_kind
  from public.entitlement_definitions as d
  where d.key = new.entitlement_key;

  if (v_kind = 'boolean' and (new.boolean_value is null or new.integer_value is not null))
    or (v_kind = 'integer' and (new.integer_value is null or new.boolean_value is not null)) then
    raise exception using errcode = '23514', message = 'invalid_entitlement_value_type';
  end if;
  return new;
end;
$$;

create or replace function private.audit_entitlement_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record jsonb := coalesce(to_jsonb(new), to_jsonb(old), '{}'::jsonb);
begin
  insert into public.access_audit_events (event_type, actor_user_id, details)
  values (
    'entitlement_configuration_changed',
    auth.uid(),
    jsonb_build_object(
      'operation', tg_op,
      'object', tg_table_name,
      'identifier', coalesce(
        v_record ->> 'code',
        v_record ->> 'key',
        concat_ws(':', v_record ->> 'plan_code', v_record ->> 'entitlement_key')
      )
    )
  );
  return coalesce(new, old);
end;
$$;

create or replace function private.effective_membership_plan(p_user_id uuid)
returns public.membership_level
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select s.plan_code
      from public.subscriptions as s
      join public.membership_plans as p on p.code = s.plan_code
      where s.user_id = p_user_id
        and s.status = 'active'
        and s.period_start <= pg_catalog.now()
        and (s.period_end is null or s.period_end > pg_catalog.now())
        and p.is_active
      order by p.sort_order desc, s.activated_at desc, s.id
      limit 1
    ),
    'basic'::public.membership_level
  );
$$;

create or replace function private.entitlements_for_plan(p_plan public.membership_level)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(
      pe.entitlement_key,
      case
        when d.value_kind = 'boolean' then to_jsonb(pe.boolean_value)
        else to_jsonb(pe.integer_value)
      end
      order by pe.entitlement_key
    ),
    '{}'::jsonb
  )
  from public.plan_entitlements as pe
  join public.entitlement_definitions as d on d.key = pe.entitlement_key
  where pe.plan_code = p_plan;
$$;

create or replace function private.numeric_limits_for_plan(p_plan public.membership_level)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(pe.entitlement_key, pe.integer_value order by pe.entitlement_key), '{}'::jsonb)
  from public.plan_entitlements as pe
  join public.entitlement_definitions as d on d.key = pe.entitlement_key
  where pe.plan_code = p_plan and d.value_kind = 'integer';
$$;

create or replace function private.workspace_as_json(p_workspace_id uuid, p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', w.id,
    'kind', w.kind,
    'name', w.name,
    'slug', w.slug,
    'role', wm.role,
    'archived_at', w.archived_at,
    'created_at', w.created_at,
    'updated_at', w.updated_at
  )
  from public.workspaces as w
  join public.workspace_members as wm on wm.workspace_id = w.id and wm.user_id = p_user_id
  where w.id = p_workspace_id;
$$;

create or replace function private.sync_profile_membership_projection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := coalesce(new.user_id, old.user_id);
  v_actor_id uuid;
  v_previous public.membership_level;
  v_effective public.membership_level;
begin
  if not exists (select 1 from auth.users as u where u.id = v_user_id) then
    return coalesce(new, old);
  end if;
  select u.id into v_actor_id from auth.users as u where u.id = auth.uid();
  select p.membership into v_previous from public.profiles as p where p.id = v_user_id for update;
  if not found then
    return coalesce(new, old);
  end if;
  v_effective := private.effective_membership_plan(v_user_id);

  insert into public.access_audit_events (event_type, actor_user_id, subject_user_id, details)
  values (
    'subscription_lifecycle_changed',
    v_actor_id,
    v_user_id,
    jsonb_build_object(
      'operation', tg_op,
      'from_status', case when tg_op in ('UPDATE', 'DELETE') then old.status else null end,
      'to_status', case when tg_op in ('INSERT', 'UPDATE') then new.status else null end,
      'plan', coalesce(new.plan_code, old.plan_code)
    )
  );

  if v_previous is distinct from v_effective then
    update public.profiles set membership = v_effective where id = v_user_id;
    insert into public.access_audit_events (event_type, actor_user_id, subject_user_id, details)
    values (
      'membership_projection_changed',
      v_actor_id,
      v_user_id,
      jsonb_build_object('from', v_previous, 'to', v_effective)
    );
  end if;
  return coalesce(new, old);
end;
$$;

create trigger validate_plan_entitlement_value_before_write
before insert or update on public.plan_entitlements
for each row execute function private.validate_plan_entitlement_value();

create trigger audit_membership_plans_after_write
after insert or update or delete on public.membership_plans
for each row execute function private.audit_entitlement_configuration();
create trigger audit_entitlement_definitions_after_write
after insert or update or delete on public.entitlement_definitions
for each row execute function private.audit_entitlement_configuration();
create trigger audit_plan_entitlements_after_write
after insert or update or delete on public.plan_entitlements
for each row execute function private.audit_entitlement_configuration();

create trigger set_membership_plans_updated_at
before update on public.membership_plans
for each row execute function private.set_access_updated_at();
create trigger set_entitlement_definitions_updated_at
before update on public.entitlement_definitions
for each row execute function private.set_access_updated_at();
create trigger set_plan_entitlements_updated_at
before update on public.plan_entitlements
for each row execute function private.set_access_updated_at();
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function private.set_access_updated_at();
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function private.set_access_updated_at();
create trigger set_workspace_members_updated_at
before update on public.workspace_members
for each row execute function private.set_access_updated_at();

create trigger sync_profile_membership_after_subscription
after insert or update or delete on public.subscriptions
for each row execute function private.sync_profile_membership_projection();

create or replace function public.ensure_my_personal_workspace()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_created boolean := false;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not exists (
    select 1 from public.profiles as p
    where p.id = v_user_id and p.onboarding_completed
  ) then
    raise exception using errcode = '42501', message = 'onboarding_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('personal-workspace:' || v_user_id::text, 0));

  select w.id into v_workspace_id
  from public.workspaces as w
  where w.owner_id = v_user_id and w.kind = 'personal'
  for update;

  if v_workspace_id is null then
    insert into public.workspaces (kind, owner_id, name, slug)
    values (
      'personal',
      v_user_id,
      'Personal Space',
      'personal-' || left(replace(v_user_id::text, '-', ''), 12)
    )
    returning id into v_workspace_id;
    v_created := true;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, created_by)
  values (v_workspace_id, v_user_id, 'owner', v_user_id)
  on conflict (workspace_id, user_id) do update
    set role = 'owner';

  if v_created then
    insert into public.access_audit_events (event_type, actor_user_id, subject_user_id, workspace_id)
    values ('personal_workspace_provisioned', v_user_id, v_user_id, v_workspace_id);
  end if;

  return private.workspace_as_json(v_workspace_id, v_user_id);
end;
$$;

create or replace function public.create_business_workspace(p_name text, p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_plan public.membership_level;
  v_entitlements jsonb;
  v_limit integer;
  v_workspace_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if length(v_name) < 2 or length(v_name) > 80 then
    raise exception using errcode = '23514', message = 'invalid_workspace_name';
  end if;
  if length(v_slug) < 3 or length(v_slug) > 48 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception using errcode = '23514', message = 'invalid_workspace_slug';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('business-workspace:' || v_user_id::text, 0));
  v_plan := private.effective_membership_plan(v_user_id);
  v_entitlements := private.entitlements_for_plan(v_plan);
  v_limit := coalesce((v_entitlements ->> 'business_workspace_limit')::integer, 0);

  if coalesce((v_entitlements ->> 'business_workspace')::boolean, false) is not true then
    raise exception using errcode = '42501', message = 'business_workspace_not_entitled';
  end if;
  if (
    select count(*) from public.workspaces as w
    where w.owner_id = v_user_id and w.kind = 'business' and w.archived_at is null
  ) >= v_limit then
    raise exception using errcode = '23514', message = 'business_workspace_limit_reached';
  end if;

  begin
    insert into public.workspaces (kind, owner_id, name, slug)
    values ('business', v_user_id, v_name, v_slug)
    returning id into v_workspace_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'workspace_slug_unavailable';
  end;

  insert into public.workspace_members (workspace_id, user_id, role, created_by)
  values (v_workspace_id, v_user_id, 'owner', v_user_id);
  insert into public.access_audit_events (event_type, actor_user_id, subject_user_id, workspace_id)
  values ('business_workspace_created', v_user_id, v_user_id, v_workspace_id);

  return private.workspace_as_json(v_workspace_id, v_user_id);
end;
$$;

create or replace function public.update_workspace(p_workspace_id uuid, p_name text, p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_role public.workspace_role;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if length(v_name) < 2 or length(v_name) > 80 then
    raise exception using errcode = '23514', message = 'invalid_workspace_name';
  end if;
  if length(v_slug) < 3 or length(v_slug) > 48 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception using errcode = '23514', message = 'invalid_workspace_slug';
  end if;

  select wm.role into v_role
  from public.workspace_members as wm
  join public.workspaces as w on w.id = wm.workspace_id
  where wm.workspace_id = p_workspace_id and wm.user_id = v_user_id and w.archived_at is null
  for update of w;
  if v_role is null then
    raise exception using errcode = '42501', message = 'workspace_access_denied';
  end if;
  if v_role not in ('owner', 'admin') then
    raise exception using errcode = '42501', message = 'workspace_management_denied';
  end if;

  begin
    update public.workspaces set name = v_name, slug = v_slug where id = p_workspace_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'workspace_slug_unavailable';
  end;
  insert into public.access_audit_events (event_type, actor_user_id, workspace_id)
  values ('workspace_updated', v_user_id, p_workspace_id);
  return private.workspace_as_json(p_workspace_id, v_user_id);
end;
$$;

create or replace function public.archive_workspace(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.workspace_role;
  v_kind public.workspace_kind;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  select wm.role, w.kind into v_role, v_kind
  from public.workspace_members as wm
  join public.workspaces as w on w.id = wm.workspace_id
  where wm.workspace_id = p_workspace_id and wm.user_id = v_user_id and w.archived_at is null
  for update of w;
  if v_role is null then
    raise exception using errcode = '42501', message = 'workspace_access_denied';
  end if;
  if v_kind = 'personal' then
    raise exception using errcode = '42501', message = 'personal_workspace_cannot_be_archived';
  end if;
  if v_role <> 'owner' then
    raise exception using errcode = '42501', message = 'workspace_owner_required';
  end if;

  update public.workspaces
  set archived_at = pg_catalog.clock_timestamp(), archived_by = v_user_id
  where id = p_workspace_id;
  insert into public.access_audit_events (event_type, actor_user_id, workspace_id)
  values ('workspace_archived', v_user_id, p_workspace_id);
  return private.workspace_as_json(p_workspace_id, v_user_id);
end;
$$;

create or replace function public.set_workspace_member_role(
  p_workspace_id uuid,
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role public.workspace_role;
  v_target_role public.workspace_role;
  v_new_role public.workspace_role;
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if p_role not in ('admin', 'member', 'viewer') then
    raise exception using errcode = '23514', message = 'invalid_workspace_role';
  end if;
  v_new_role := p_role::public.workspace_role;

  select wm.role into v_actor_role
  from public.workspace_members as wm
  join public.workspaces as w on w.id = wm.workspace_id
  where wm.workspace_id = p_workspace_id and wm.user_id = v_actor_id and w.archived_at is null;
  select wm.role into v_target_role
  from public.workspace_members as wm
  where wm.workspace_id = p_workspace_id and wm.user_id = p_user_id
  for update;

  if v_actor_role is null or v_target_role is null then
    raise exception using errcode = '42501', message = 'workspace_member_access_denied';
  end if;
  if v_target_role = 'owner' then
    raise exception using errcode = '42501', message = 'workspace_owner_is_protected';
  end if;
  if v_actor_role = 'owner' then
    null;
  elsif v_actor_role = 'admin' and v_target_role in ('member', 'viewer') and v_new_role in ('member', 'viewer') then
    null;
  else
    raise exception using errcode = '42501', message = 'workspace_role_management_denied';
  end if;

  update public.workspace_members set role = v_new_role
  where workspace_id = p_workspace_id and user_id = p_user_id;
  insert into public.access_audit_events (event_type, actor_user_id, subject_user_id, workspace_id, details)
  values (
    'workspace_member_role_changed', v_actor_id, p_user_id, p_workspace_id,
    jsonb_build_object('from', v_target_role, 'to', v_new_role)
  );
  return jsonb_build_object('workspace_id', p_workspace_id, 'user_id', p_user_id, 'role', v_new_role);
end;
$$;

create or replace function public.remove_workspace_member(p_workspace_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role public.workspace_role;
  v_target_role public.workspace_role;
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  select wm.role into v_actor_role
  from public.workspace_members as wm
  join public.workspaces as w on w.id = wm.workspace_id
  where wm.workspace_id = p_workspace_id and wm.user_id = v_actor_id and w.archived_at is null;
  select wm.role into v_target_role
  from public.workspace_members as wm
  where wm.workspace_id = p_workspace_id and wm.user_id = p_user_id
  for update;

  if v_actor_role is null or v_target_role is null then
    raise exception using errcode = '42501', message = 'workspace_member_access_denied';
  end if;
  if v_target_role = 'owner' then
    raise exception using errcode = '42501', message = 'workspace_owner_is_protected';
  end if;
  if v_actor_role = 'owner' then
    null;
  elsif v_actor_role = 'admin' and v_target_role in ('member', 'viewer') then
    null;
  else
    raise exception using errcode = '42501', message = 'workspace_role_management_denied';
  end if;

  delete from public.workspace_members
  where workspace_id = p_workspace_id and user_id = p_user_id;
  insert into public.access_audit_events (event_type, actor_user_id, subject_user_id, workspace_id)
  values ('workspace_member_removed', v_actor_id, p_user_id, p_workspace_id);
  return true;
end;
$$;

create or replace function public.get_my_access_context()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.membership_level;
  v_entitlements jsonb;
  v_limits jsonb;
  v_subscription jsonb;
  v_personal jsonb;
  v_business jsonb;
  v_business_count integer;
  v_business_limit integer;
  v_business_reason text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  v_plan := private.effective_membership_plan(v_user_id);
  v_entitlements := private.entitlements_for_plan(v_plan);
  v_limits := private.numeric_limits_for_plan(v_plan);

  select jsonb_build_object(
    'status', s.status,
    'period_start', s.period_start,
    'period_end', s.period_end
  ) into v_subscription
  from public.subscriptions as s
  where s.user_id = v_user_id
    and s.status = 'active'
    and s.period_start <= pg_catalog.now()
    and (s.period_end is null or s.period_end > pg_catalog.now())
  order by s.activated_at desc, s.id
  limit 1;
  v_subscription := coalesce(v_subscription, jsonb_build_object('status', 'default_basic', 'period_start', null, 'period_end', null));

  select private.workspace_as_json(w.id, v_user_id) into v_personal
  from public.workspaces as w
  where w.owner_id = v_user_id and w.kind = 'personal' and w.archived_at is null;

  select coalesce(jsonb_agg(private.workspace_as_json(w.id, v_user_id) order by w.created_at, w.id), '[]'::jsonb), count(*)::integer
  into v_business, v_business_count
  from public.workspaces as w
  join public.workspace_members as wm on wm.workspace_id = w.id and wm.user_id = v_user_id
  where w.kind = 'business' and w.archived_at is null;

  v_business_limit := coalesce((v_limits ->> 'business_workspace_limit')::integer, 0);
  if coalesce((v_entitlements ->> 'business_workspace')::boolean, false) is not true then
    v_business_reason := 'membership_upgrade_required';
  elsif v_business_count >= v_business_limit then
    v_business_reason := 'workspace_limit_reached';
  else
    v_business_reason := null;
  end if;

  return jsonb_build_object(
    'context_version', 1,
    'server_timestamp', pg_catalog.clock_timestamp(),
    'active_membership_plan', v_plan,
    'subscription', v_subscription,
    'entitlements', v_entitlements,
    'numeric_limits', v_limits,
    'personal_workspace', v_personal,
    'business_workspaces', v_business,
    'locked_feature_reasons', jsonb_build_object('business_workspace', v_business_reason)
  );
end;
$$;

alter table public.membership_plans enable row level security;
alter table public.entitlement_definitions enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.access_audit_events enable row level security;

create policy subscriptions_select_own
on public.subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

create policy workspaces_select_membership
on public.workspaces for select to authenticated
using (
  archived_at is null
  and exists (
    select 1 from public.workspace_members as wm
    where wm.workspace_id = id and wm.user_id = (select auth.uid())
  )
);

create policy workspace_members_select_own
on public.workspace_members for select to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.membership_plans from anon, authenticated;
revoke all on table public.entitlement_definitions from anon, authenticated;
revoke all on table public.plan_entitlements from anon, authenticated;
revoke all on table public.subscriptions from anon, authenticated;
revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.workspace_members from anon, authenticated;
revoke all on table public.access_audit_events from anon, authenticated;

grant select on table public.subscriptions to authenticated;
grant select on table public.workspaces to authenticated;
grant select on table public.workspace_members to authenticated;

grant select, insert, update, delete on table public.membership_plans to service_role;
grant select, insert, update, delete on table public.entitlement_definitions to service_role;
grant select, insert, update, delete on table public.plan_entitlements to service_role;
grant select, insert, update, delete on table public.subscriptions to service_role;
grant select, insert, update, delete on table public.workspaces to service_role;
grant select, insert, update, delete on table public.workspace_members to service_role;
grant select, insert on table public.access_audit_events to service_role;
grant usage, select on sequence public.access_audit_events_id_seq to service_role;

revoke usage on type public.entitlement_value_kind, public.subscription_status, public.workspace_kind, public.workspace_role, public.access_audit_event_type from anon;
grant usage on type public.subscription_status, public.workspace_kind, public.workspace_role to authenticated;

revoke execute on function private.set_access_updated_at() from public, anon, authenticated;
revoke execute on function private.validate_plan_entitlement_value() from public, anon, authenticated;
revoke execute on function private.audit_entitlement_configuration() from public, anon, authenticated;
revoke execute on function private.effective_membership_plan(uuid) from public, anon, authenticated;
revoke execute on function private.entitlements_for_plan(public.membership_level) from public, anon, authenticated;
revoke execute on function private.numeric_limits_for_plan(public.membership_level) from public, anon, authenticated;
revoke execute on function private.workspace_as_json(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.sync_profile_membership_projection() from public, anon, authenticated;

revoke execute on function public.ensure_my_personal_workspace() from public, anon;
revoke execute on function public.create_business_workspace(text, text) from public, anon;
revoke execute on function public.update_workspace(uuid, text, text) from public, anon;
revoke execute on function public.archive_workspace(uuid) from public, anon;
revoke execute on function public.set_workspace_member_role(uuid, uuid, text) from public, anon;
revoke execute on function public.remove_workspace_member(uuid, uuid) from public, anon;
revoke execute on function public.get_my_access_context() from public, anon;

grant execute on function public.ensure_my_personal_workspace() to authenticated;
grant execute on function public.create_business_workspace(text, text) to authenticated;
grant execute on function public.update_workspace(uuid, text, text) to authenticated;
grant execute on function public.archive_workspace(uuid) to authenticated;
grant execute on function public.set_workspace_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.get_my_access_context() to authenticated;

grant execute on function private.effective_membership_plan(uuid) to service_role;
grant execute on function private.entitlements_for_plan(public.membership_level) to service_role;
grant execute on function private.numeric_limits_for_plan(public.membership_level) to service_role;

comment on table public.membership_plans is 'Canonical membership identifiers. Commercial price and marketing claims are intentionally out of scope.';
comment on table public.subscriptions is 'Server-managed paid membership lifecycle. The mobile client has read-only access to its own rows.';
comment on column public.profiles.membership is 'Server-managed projection of effective membership. Authorization must use effective subscriptions and entitlements.';
comment on column public.profiles.upgrade_intent is 'Non-binding client intent only. It never grants membership or entitlement.';
comment on table public.workspaces is 'Personal and Business Workspace records. Business creation is entitlement-gated by RPC.';
comment on table public.access_audit_events is 'Append-only backend audit trail for sensitive membership and workspace changes.';
comment on function public.get_my_access_context() is 'Canonical authenticated access context. It accepts no user, membership, or role input.';
comment on function public.ensure_my_personal_workspace() is 'Idempotent post-onboarding Personal Workspace provisioning, kept out of the auth signup trigger.';

commit;
