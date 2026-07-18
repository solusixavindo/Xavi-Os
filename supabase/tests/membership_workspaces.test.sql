begin;

create extension if not exists pgtap with schema extensions;
select plan(85);

-- Canonical plans and technical entitlements.
select is((select count(*) from public.membership_plans), 4::bigint, 'four canonical membership plans exist');
select set_eq(
  $$select code::text from public.membership_plans$$,
  array['basic', 'pro', 'premium', 'platinum'],
  'only canonical membership plan identifiers exist'
);
select ok((select is_active and not is_paid from public.membership_plans where code = 'basic'), 'Basic is active and free by definition');
select is(
  (select count(*) from public.plan_entitlements where entitlement_key = 'personal_workspace' and boolean_value),
  4::bigint,
  'every plan has Personal Workspace entitlement'
);
select results_eq(
  $$select plan_code::text, integer_value from public.plan_entitlements where entitlement_key = 'business_workspace_limit' order by plan_code$$,
  $$values ('basic', 0), ('platinum', 10), ('premium', 3), ('pro', 1)$$,
  'Business Workspace limits match the explicit technical matrix'
);
select throws_ok(
  $$insert into public.plan_entitlements (plan_code, entitlement_key, integer_value) values ('basic', 'personal_workspace', 1) on conflict (plan_code, entitlement_key) do update set boolean_value = null, integer_value = 1$$,
  '23514',
  'invalid_entitlement_value_type',
  'entitlement values must match their canonical type'
);
update public.membership_plans set display_name = 'Pro Test' where code = 'pro';
select is(
  (select count(*) from public.access_audit_events where event_type = 'entitlement_configuration_changed'),
  1::bigint,
  'backend entitlement configuration changes create an audit event'
);

-- Test identities. These rows are rolled back with this test transaction.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '11000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'workspace-a@example.test', 'test-only', '{}',
    '{"full_name":"Workspace A","phone":"+628111111110","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}', now(), now()
  ),
  (
    '22000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'workspace-b@example.test', 'test-only', '{}',
    '{"full_name":"Workspace B","phone":"+628222222220","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}', now(), now()
  ),
  (
    '33000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'workspace-c@example.test', 'test-only', '{}',
    '{"full_name":"Workspace C","phone":"+628333333330","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}', now(), now()
  ),
  (
    '44000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'workspace-d@example.test', 'test-only', '{}',
    '{"full_name":"Workspace D","phone":"+628444444440","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}', now(), now()
  );

update public.profiles set onboarding_completed = true
where id in (
  '11000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000002',
  '33000000-0000-4000-8000-000000000003',
  '44000000-0000-4000-8000-000000000004'
);

select is(
  (select membership::text from public.profiles where id = '11000000-0000-4000-8000-000000000001'),
  'basic',
  'new users are effectively Basic'
);
update public.profiles set upgrade_intent = 'platinum' where id = '11000000-0000-4000-8000-000000000001';
select is(
  (select upgrade_intent::text from public.profiles where id = '11000000-0000-4000-8000-000000000001'),
  'platinum',
  'paid plan selection is stored only as upgrade intent'
);
select is(
  private.effective_membership_plan('11000000-0000-4000-8000-000000000001')::text,
  'basic',
  'upgrade intent does not grant effective membership'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok($$select public.ensure_my_personal_workspace()$$, 'Personal Workspace provisioning succeeds after onboarding');
select is((select count(*) from public.workspaces where kind = 'personal'), 1::bigint, 'one Personal Workspace is created');
select is((select kind::text from public.workspaces limit 1), 'personal', 'provisioned workspace has Personal kind');
select is((select role::text from public.workspace_members limit 1), 'owner', 'Personal Workspace owner is recorded as a member');
select throws_ok(
  $$select * from public.access_audit_events$$,
  '42501',
  'permission denied for table access_audit_events',
  'audit events are not directly readable by mobile clients'
);
select lives_ok($$select public.ensure_my_personal_workspace()$$, 'Personal Workspace provisioning retry succeeds');
select is((select count(*) from public.workspaces where kind = 'personal'), 1::bigint, 'provisioning retry creates no duplicate');

select is((public.get_my_access_context() ->> 'active_membership_plan'), 'basic', 'access context reports effective Basic plan');
select is((public.get_my_access_context() #>> '{subscription,status}'), 'default_basic', 'access context reports implicit Basic status');
select is((public.get_my_access_context() #>> '{entitlements,business_workspace}'), 'false', 'Basic Business Workspace is locked');
select is((public.get_my_access_context() #>> '{numeric_limits,business_workspace_limit}'), '0', 'Basic Business Workspace limit is zero');
select is(
  (public.get_my_access_context() #>> '{locked_feature_reasons,business_workspace}'),
  'membership_upgrade_required',
  'Basic access context includes a safe locked reason'
);
select throws_ok(
  $$select public.create_business_workspace('Denied Business', 'denied-business')$$,
  '42501', 'business_workspace_not_entitled', 'Basic cannot create a Business Workspace'
);
select throws_ok(
  $$update public.profiles set membership = 'platinum' where id = '11000000-0000-4000-8000-000000000001'$$,
  '42501', 'permission denied for table profiles', 'mobile cannot update membership projection'
);
select throws_ok(
  $$insert into public.subscriptions (user_id, plan_code) values ('11000000-0000-4000-8000-000000000001', 'pro')$$,
  '42501', 'permission denied for table subscriptions', 'mobile cannot insert subscriptions'
);
select throws_ok(
  $$insert into public.workspaces (kind, owner_id, name, slug) values ('business', '11000000-0000-4000-8000-000000000001', 'Bypass', 'bypass-workspace')$$,
  '42501', 'permission denied for table workspaces', 'mobile cannot insert workspaces directly'
);
select throws_ok(
  $$insert into public.workspace_members (workspace_id, user_id, role) select id, '22000000-0000-4000-8000-000000000002', 'admin' from public.workspaces limit 1$$,
  '42501', 'permission denied for table workspace_members', 'mobile cannot insert or elevate workspace roles directly'
);
select throws_ok(
  $$insert into public.access_audit_events (event_type) values ('workspace_updated')$$,
  '42501', 'permission denied for table access_audit_events', 'mobile cannot manipulate audit events'
);

reset role;
insert into public.subscriptions (
  user_id, plan_code, status, period_start, period_end, activated_at
)
values (
  '11000000-0000-4000-8000-000000000001', 'pro', 'active', now() - interval '1 hour', now() + interval '30 days', now()
);
select throws_ok(
  $$insert into public.subscriptions (
    user_id, plan_code, status, period_start, period_end, activated_at
  ) values (
    '11000000-0000-4000-8000-000000000001', 'premium', 'active', now() - interval '1 minute', now() + interval '1 day', now()
  )$$,
  '23505',
  'duplicate key value violates unique constraint "subscriptions_one_active_per_user_idx"',
  'overlapping active paid subscriptions are rejected'
);
select is(
  (select membership::text from public.profiles where id = '11000000-0000-4000-8000-000000000001'),
  'pro',
  'active subscription updates the profile membership projection server-side'
);
select is(
  (select count(*) from public.access_audit_events where event_type = 'membership_projection_changed'),
  1::bigint,
  'membership projection change creates an audit event'
);
select is(
  (select count(*) from public.access_audit_events where event_type = 'subscription_lifecycle_changed'),
  1::bigint,
  'subscription lifecycle change creates an audit event even when tracked separately from projection'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);
select is((public.get_my_access_context() ->> 'active_membership_plan'), 'pro', 'access context derives Pro from active subscription');
select is((public.get_my_access_context() #>> '{subscription,status}'), 'active', 'access context exposes active subscription status');
select is((public.get_my_access_context() #>> '{entitlements,business_workspace}'), 'true', 'Pro grants Business Workspace entitlement');
select is((public.get_my_access_context() #>> '{numeric_limits,business_workspace_limit}'), '1', 'Pro Business Workspace limit is one');
select lives_ok(
  $$select public.create_business_workspace('Business Alpha', 'business-alpha')$$,
  'entitled owner can create a Business Workspace'
);
select is((select count(*) from public.workspaces where kind = 'business'), 1::bigint, 'one Business Workspace is created');
select is(
  (select role::text from public.workspace_members where workspace_id = (select id from public.workspaces where kind = 'business') and user_id = '11000000-0000-4000-8000-000000000001'),
  'owner',
  'Business Workspace creator is recorded as owner'
);
select throws_ok(
  $$select public.create_business_workspace('Business Two', 'business-two')$$,
  '23514', 'business_workspace_limit_reached', 'server enforces the Pro workspace limit'
);

reset role;
insert into public.workspace_members (workspace_id, user_id, role, created_by)
select id, '22000000-0000-4000-8000-000000000002', 'member', '11000000-0000-4000-8000-000000000001'
from public.workspaces where kind = 'business';
insert into public.workspace_members (workspace_id, user_id, role, created_by)
select id, '33000000-0000-4000-8000-000000000003', 'admin', '11000000-0000-4000-8000-000000000001'
from public.workspaces where kind = 'business';
insert into public.workspace_members (workspace_id, user_id, role, created_by)
select id, '44000000-0000-4000-8000-000000000004', 'viewer', '11000000-0000-4000-8000-000000000001'
from public.workspaces where kind = 'business';

set local role authenticated;
select set_config('request.jwt.claim.sub', '22000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.workspaces), 1::bigint, 'member reads only a workspace they belong to');
select is((select count(*) from public.subscriptions), 0::bigint, 'member cannot read another user subscription');
select is((public.get_my_access_context() ->> 'active_membership_plan'), 'basic', 'member access context uses their own membership only');
select is(jsonb_array_length(public.get_my_access_context() -> 'business_workspaces'), 1, 'member context lists only accessible Business Workspaces');
select throws_ok(
  $$select public.update_workspace((select id from public.workspaces limit 1), 'Member Rename', 'member-rename')$$,
  '42501', 'workspace_management_denied', 'member cannot update a workspace'
);
select throws_ok(
  $$select public.set_workspace_member_role((select id from public.workspaces limit 1), '22000000-0000-4000-8000-000000000002', 'admin')$$,
  '42501', 'workspace_role_management_denied', 'member cannot elevate their own role'
);

select set_config('request.jwt.claim.sub', '33000000-0000-4000-8000-000000000003', true);
select lives_ok(
  $$select public.update_workspace((select id from public.workspaces limit 1), 'Admin Rename', 'admin-rename')$$,
  'admin can update an active workspace'
);
select throws_ok(
  $$select public.set_workspace_member_role((select id from public.workspaces limit 1), '22000000-0000-4000-8000-000000000002', 'admin')$$,
  '42501', 'workspace_role_management_denied', 'admin cannot promote a member to admin'
);

select set_config('request.jwt.claim.sub', '44000000-0000-4000-8000-000000000004', true);
select throws_ok(
  $$select public.update_workspace((select id from public.workspaces limit 1), 'Viewer Rename', 'viewer-rename')$$,
  '42501', 'workspace_management_denied', 'viewer is read-only'
);

select set_config('request.jwt.claim.sub', '33000000-0000-4000-8000-000000000003', true);
select lives_ok(
  $$select public.remove_workspace_member((select id from public.workspaces limit 1), '44000000-0000-4000-8000-000000000004')$$,
  'admin can remove a viewer'
);

select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.set_workspace_member_role((select id from public.workspaces where kind = 'business'), '22000000-0000-4000-8000-000000000002', 'viewer')$$,
  'owner can change a non-owner workspace role'
);
select set_config('request.jwt.claim.sub', '22000000-0000-4000-8000-000000000002', true);
select is(
  (select role::text from public.workspace_members where user_id = '22000000-0000-4000-8000-000000000002'),
  'viewer',
  'owner role change is persisted'
);
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.set_workspace_member_role((select id from public.workspaces where kind = 'business'), '11000000-0000-4000-8000-000000000001', 'member')$$,
  '42501', 'workspace_owner_is_protected', 'workspace owner cannot be downgraded'
);
select throws_ok(
  $$select public.remove_workspace_member((select id from public.workspaces where kind = 'business'), '11000000-0000-4000-8000-000000000001')$$,
  '42501', 'workspace_owner_is_protected', 'workspace owner cannot be removed'
);
select lives_ok(
  $$select public.archive_workspace((select id from public.workspaces where kind = 'business'))$$,
  'owner can archive a Business Workspace'
);
select is((select count(*) from public.workspaces where kind = 'business'), 0::bigint, 'archived workspace is excluded by active RLS');
select is(jsonb_array_length(public.get_my_access_context() -> 'business_workspaces'), 0, 'archived workspace is excluded from access context');
select throws_ok(
  $$select public.update_workspace(
    (
      select workspace_id from public.workspace_members
      where user_id = '11000000-0000-4000-8000-000000000001'
        and workspace_id <> (public.get_my_access_context() #>> '{personal_workspace,id}')::uuid
      limit 1
    ),
    'Archived',
    'archived'
  )$$,
  '42501', 'workspace_access_denied', 'archived workspace cannot be used as active workspace'
);
select lives_ok(
  $$select public.create_business_workspace('Business Replacement', 'business-replacement')$$,
  'archived workspace no longer consumes the active workspace limit'
);
select throws_ok(
  $$select public.archive_workspace((select id from public.workspaces where kind = 'personal'))$$,
  '42501', 'personal_workspace_cannot_be_archived', 'Personal Workspace cannot be archived'
);

reset role;
select is(
  (select count(*) from public.access_audit_events where event_type in ('business_workspace_created', 'workspace_updated', 'workspace_member_role_changed', 'workspace_member_removed', 'workspace_archived')),
  6::bigint,
  'sensitive workspace changes produce audit events'
);
select is((select count(*) from public.workspaces where kind = 'personal'), 1::bigint, 'Personal Workspace remains unique after workspace lifecycle changes');

delete from public.workspace_members
where workspace_id = (select id from public.workspaces where kind = 'personal')
  and user_id = '11000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.ensure_my_personal_workspace()$$, 'provisioning retry repairs a missing owner membership');
reset role;
select is(
  (select count(*) from public.workspace_members where workspace_id = (select id from public.workspaces where kind = 'personal') and role = 'owner'),
  1::bigint,
  'provisioning repair restores exactly one Personal Workspace owner member'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '55000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'workspace-delete@example.test', 'test-only', '{}',
  '{"full_name":"Workspace Delete","phone":"+628555555550","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}', now(), now()
);
insert into public.subscriptions (user_id, plan_code, status, period_start, period_end, activated_at)
values (
  '55000000-0000-4000-8000-000000000005', 'pro', 'active', now() - interval '1 hour', now() + interval '1 day', now()
);
update public.profiles set onboarding_completed = true
where id = '55000000-0000-4000-8000-000000000005';
set local role authenticated;
select set_config('request.jwt.claim.sub', '55000000-0000-4000-8000-000000000005', true);
select lives_ok(
  $$select public.ensure_my_personal_workspace()$$,
  'lifecycle user can provision a Personal Workspace before account deletion'
);
reset role;
select lives_ok(
  $$delete from auth.users where id = '55000000-0000-4000-8000-000000000005'$$,
  'account deletion safely cascades an active subscription lifecycle'
);
select is(
  (select count(*) from public.subscriptions where user_id = '55000000-0000-4000-8000-000000000005'),
  0::bigint,
  'account deletion leaves no subscription orphan'
);
select is(
  (select count(*) from public.workspaces where owner_id = '55000000-0000-4000-8000-000000000005'),
  0::bigint,
  'account deletion leaves no workspace orphan while preserving nullable audit history'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '66000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'workspace-expired@example.test', 'test-only', '{}',
    '{"full_name":"Expired Subscription","phone":"+628666666660","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}', now(), now()
  ),
  (
    '77000000-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'workspace-cancelled@example.test', 'test-only', '{}',
    '{"full_name":"Cancelled Subscription","phone":"+628777777770","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}', now(), now()
  );
insert into public.subscriptions (
  user_id, plan_code, status, period_start, period_end, activated_at, ended_at, cancelled_at
)
values
  (
    '66000000-0000-4000-8000-000000000006', 'premium', 'expired', now() - interval '30 days', now() - interval '1 day', now() - interval '30 days', now() - interval '1 day', null
  ),
  (
    '77000000-0000-4000-8000-000000000007', 'platinum', 'cancelled', now() - interval '2 days', now() + interval '28 days', now() - interval '2 days', null, now() - interval '1 day'
  );
select is(
  private.effective_membership_plan('66000000-0000-4000-8000-000000000006')::text,
  'basic',
  'expired subscription falls back to effective Basic'
);
select is(
  private.effective_membership_plan('77000000-0000-4000-8000-000000000007')::text,
  'basic',
  'cancelled subscription falls back to effective Basic'
);

-- Privilege, RLS, and SECURITY DEFINER hardening.
select is(
  (select count(*) from pg_class where oid in (
    'public.membership_plans'::regclass,
    'public.entitlement_definitions'::regclass,
    'public.plan_entitlements'::regclass,
    'public.subscriptions'::regclass,
    'public.workspaces'::regclass,
    'public.workspace_members'::regclass,
    'public.access_audit_events'::regclass
  ) and relrowsecurity),
  7::bigint,
  'RLS is enabled on all membership and workspace tables'
);
select ok(
  not has_table_privilege('authenticated', 'public.subscriptions', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.workspaces', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.workspace_members', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.access_audit_events', 'INSERT,UPDATE,DELETE'),
  'authenticated has no direct sensitive DML privilege'
);
select ok(
  has_table_privilege('service_role', 'public.subscriptions', 'SELECT,INSERT,UPDATE,DELETE')
  and has_table_privilege('service_role', 'public.workspaces', 'SELECT,INSERT,UPDATE,DELETE')
  and has_table_privilege('service_role', 'public.workspace_members', 'SELECT,INSERT,UPDATE,DELETE')
  and has_table_privilege('service_role', 'public.access_audit_events', 'SELECT,INSERT'),
  'service_role has explicit backend privileges'
);
select is(
  (
    select count(*) from pg_proc
    where oid in (
      'public.ensure_my_personal_workspace()'::regprocedure,
      'public.create_business_workspace(text,text)'::regprocedure,
      'public.update_workspace(uuid,text,text)'::regprocedure,
      'public.archive_workspace(uuid)'::regprocedure,
      'public.set_workspace_member_role(uuid,uuid,text)'::regprocedure,
      'public.remove_workspace_member(uuid,uuid)'::regprocedure,
      'public.get_my_access_context()'::regprocedure
    ) and prosecdef and proconfig = array['search_path=""']
  ),
  7::bigint,
  'all public access RPCs are SECURITY DEFINER with an empty search path'
);
select ok(
  not has_function_privilege('authenticated', 'private.effective_membership_plan(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.entitlements_for_plan(public.membership_level)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.workspace_as_json(uuid,uuid)', 'EXECUTE'),
  'authenticated cannot execute internal entitlement functions'
);
select is(
  (
    select count(*)
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prosecdef
      and p.proconfig is distinct from array['search_path=""']
  ),
  0::bigint,
  'every SECURITY DEFINER function in public and private has an empty fixed search path'
);
select is(
  (
    select count(*)
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  ),
  0::bigint,
  'no internal private function is executable by mobile roles'
);
select ok(
  has_function_privilege('authenticated', 'public.get_my_access_context()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_my_access_context()', 'EXECUTE'),
  'access-context RPC is authenticated-only'
);
select is(
  (select pronargs from pg_proc where oid = 'public.get_my_access_context()'::regprocedure),
  0::smallint,
  'access-context RPC accepts no user, membership, or role input'
);
select set_eq(
  $$select enumlabel from pg_enum where enumtypid = 'public.workspace_role'::regtype$$,
  array['owner', 'admin', 'member', 'viewer'],
  'workspace roles are restricted to the canonical role set'
);
select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'workspaces_one_personal_per_owner_idx'),
  'database enforces one Personal Workspace per owner'
);
select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'subscriptions_one_active_per_user_idx'),
  'database enforces one active paid subscription per user'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select public.get_my_access_context()$$,
  '42501', 'permission denied for function get_my_access_context', 'anonymous clients cannot obtain membership access context'
);
select throws_ok(
  $$select * from public.workspaces$$,
  '42501', 'permission denied for table workspaces', 'anonymous clients cannot read workspaces'
);
select throws_ok(
  $$select * from public.subscriptions$$,
  '42501', 'permission denied for table subscriptions', 'anonymous clients cannot read subscriptions'
);

reset role;
select * from finish();
rollback;
