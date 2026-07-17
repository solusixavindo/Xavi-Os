begin;

create extension if not exists pgtap with schema extensions;
select plan(54);

select throws_ok(
  $$
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '40000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'missing-terms@example.test', 'test-only',
      '{}'::jsonb, '{}'::jsonb, now(), now()
    )
  $$,
  '23514',
  'terms_acceptance_required',
  'signup metadata without legal acceptance is rejected safely'
);

select throws_ok(
  $$
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '50000000-0000-0000-0000-000000000005',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'missing-version@example.test', 'test-only',
      '{}'::jsonb,
      '{"full_name":"Missing Version","phone":"+628555555555","terms_accepted":true}'::jsonb,
      now(), now()
    )
  $$,
  '23514',
  'terms_acceptance_required',
  'signup metadata without legal versions is rejected safely'
);

select throws_ok(
  $$
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '60000000-0000-0000-0000-000000000006',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'invalid-phone@example.test', 'test-only',
      '{}'::jsonb,
      '{"full_name":"Invalid Phone","phone":"not-a-phone","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}'::jsonb,
      now(), now()
    )
  $$,
  '23514',
  'invalid_phone',
  'invalid phone metadata is rejected safely'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'user-a@example.test', 'test-only',
  '{}'::jsonb,
  '{"full_name":"User A","phone":"+62 811-1111-111","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}'::jsonb,
  now(), now()
);

select is(
  (select count(*) from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  1::bigint,
  'valid auth signup creates exactly one profile'
);
select is(
  (select membership::text from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'basic',
  'a new profile is always Basic'
);
select is(
  (select role::text from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'member',
  'a new profile is always a member'
);
select is(
  (select xavi_points from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'a new profile starts with zero points'
);
select is(
  (select phone from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  '+628111111111',
  'signup phone is normalized before persistence'
);
select is(
  (select email_verified_at from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  null::timestamptz,
  'an unconfirmed auth user starts unverified'
);
select matches(
  (select referral_code from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  '^X[A-Z0-9]{11}$',
  'server creates a correctly formatted referral code'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'user-b@example.test', 'test-only',
  '{}'::jsonb,
  jsonb_build_object(
    'full_name', 'User B',
    'phone', '+628222222222',
    'terms_accepted', true,
    'terms_version', '2026-07-17',
    'privacy_version', '2026-07-17',
    'referral_code_input', (select referral_code from public.profiles where id = '10000000-0000-0000-0000-000000000001')
  ),
  now(), now();

select is(
  (select referred_by from public.profiles where id = '20000000-0000-0000-0000-000000000002'),
  '10000000-0000-0000-0000-000000000001'::uuid,
  'valid referral attribution is created server-side'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '30000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'user-c@example.test', 'test-only',
  '{}'::jsonb,
  '{"full_name":"User C","phone":"+628333333333","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17","referral_code_input":"NOT-VALID"}'::jsonb,
  now(), now()
);

select is(
  (select referred_by from public.profiles where id = '30000000-0000-0000-0000-000000000003'),
  null::uuid,
  'invalid referral input creates no attribution'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '70000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'user-d@example.test', 'test-only',
  '{}'::jsonb,
  jsonb_build_object(
    'full_name', 'User D',
    'phone', '+628777777777',
    'terms_accepted', true,
    'terms_version', '2026-07-17',
    'privacy_version', '2026-07-17',
    'referral_code_input', public.make_referral_code('70000000-0000-0000-0000-000000000007', 0)
  ),
  now(), now()
);

select is(
  (select referred_by from public.profiles where id = '70000000-0000-0000-0000-000000000007'),
  null::uuid,
  'self-referral is rejected'
);
select is(
  (select count(distinct referral_code) from public.profiles),
  (select count(*) from public.profiles),
  'all generated referral codes are unique'
);
select throws_ok(
  $$update public.profiles set referred_by = '20000000-0000-0000-0000-000000000002' where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  'profile_attribution_is_immutable',
  'referral attribution cannot be changed after creation'
);
select throws_ok(
  $$
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '80000000-0000-0000-0000-000000000008',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'duplicate-phone@example.test', 'test-only',
      '{}'::jsonb,
      '{"full_name":"Duplicate Phone","phone":"+62 (811) 1111-111","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}'::jsonb,
      now(), now()
    )
  $$,
  '23505',
  'phone_already_registered',
  'duplicate normalized phone is rejected with a safe error'
);

create temporary table profile_test_state as
select updated_at from public.profiles where id = '10000000-0000-0000-0000-000000000001';
select pg_sleep(0.01);
update auth.users
set email_confirmed_at = now(), updated_at = now()
where id = '10000000-0000-0000-0000-000000000001';

select ok(
  (select email_verified_at is not null from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'email verification timestamp syncs from auth.users'
);
select ok(
  (select p.updated_at > s.updated_at from public.profiles p cross join profile_test_state s where p.id = '10000000-0000-0000-0000-000000000001'),
  'updated_at advances when the profile is changed by a trigger'
);
select ok(
  (select terms_accepted_at is not null from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'legal acceptance timestamp is persisted'
);
select is(
  (select terms_version || ':' || privacy_version from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  '2026-07-17:2026-07-17',
  'legal document versions are persisted'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '90000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'delete-me@example.test', 'test-only',
  '{}'::jsonb,
  '{"full_name":"Delete Me","phone":"+628999999999","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}'::jsonb,
  now(), now()
);
select is(
  (select count(*) from public.profiles where id = '90000000-0000-0000-0000-000000000009'),
  1::bigint,
  'profile trigger runs for a deletable lifecycle user'
);
delete from auth.users where id = '90000000-0000-0000-0000-000000000009';
select is(
  (select count(*) from public.profiles where id = '90000000-0000-0000-0000-000000000009'),
  0::bigint,
  'deleting an unreferenced auth user cascades to its profile'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
select ok(has_table_privilege('authenticated', 'public.profiles', 'SELECT'), 'authenticated has SELECT privilege');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'INSERT'), 'authenticated has no INSERT privilege');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'), 'authenticated has no UPDATE privilege');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'DELETE'), 'authenticated has no DELETE privilege');
select ok(has_table_privilege('service_role', 'public.profiles', 'SELECT'), 'service_role retains backend SELECT privilege');
select ok(
  has_function_privilege('authenticated', 'public.update_my_profile(text,text,text,boolean,public.membership_level)', 'EXECUTE'),
  'authenticated can execute only the profile update RPC'
);
select ok(
  not has_function_privilege('anon', 'public.update_my_profile(text,text,text,boolean,public.membership_level)', 'EXECUTE'),
  'anon cannot execute the profile update RPC'
);
select ok(
  not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid = 'public.update_my_profile(text,text,text,boolean,public.membership_level)'::regprocedure
      and a.grantee = 0
      and a.privilege_type = 'EXECUTE'
  ),
  'PUBLIC has no execute privilege on the profile update RPC'
);
select ok(
  not has_function_privilege('authenticated', 'public.make_referral_code(uuid,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.handle_new_auth_user()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.sync_auth_user_profile()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.set_profile_updated_at()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.protect_profile_attribution()', 'EXECUTE'),
  'authenticated cannot execute internal database functions'
);
select is(
  (
    select count(*)
    from pg_proc
    where oid in (
      'public.make_referral_code(uuid,integer)'::regprocedure,
      'public.handle_new_auth_user()'::regprocedure,
      'public.sync_auth_user_profile()'::regprocedure,
      'public.update_my_profile(text,text,text,boolean,public.membership_level)'::regprocedure
    )
      and prosecdef
      and proconfig = array['search_path=""']
  ),
  4::bigint,
  'all SECURITY DEFINER functions have an empty fixed search_path'
);
select ok(
  (
    select bool_and(pg_get_userbyid(proowner) = 'postgres')
    from pg_proc
    where oid in (
      'public.make_referral_code(uuid,integer)'::regprocedure,
      'public.handle_new_auth_user()'::regprocedure,
      'public.sync_auth_user_profile()'::regprocedure,
      'public.set_profile_updated_at()'::regprocedure,
      'public.protect_profile_attribution()'::regprocedure,
      'public.update_my_profile(text,text,text,boolean,public.membership_level)'::regprocedure
    )
  ),
  'profile functions are owned by postgres'
);

create schema attacker;
create table attacker.profiles (id uuid, membership text, role text);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select count(*) from public.profiles), 1::bigint, 'User A can read only their own profile');
select is(
  (select count(*) from public.profiles where id = '20000000-0000-0000-0000-000000000002'),
  0::bigint,
  'User A cannot read User B profile'
);
select throws_ok(
  $$insert into public.profiles (id, email, referral_code, terms_accepted_at, terms_version, privacy_version) values (gen_random_uuid(), 'attack@example.test', 'X12345678901', now(), '2026-07-17', '2026-07-17')$$,
  '42501',
  'permission denied for table profiles',
  'mobile role cannot insert profiles directly'
);
select throws_ok(
  $$update public.profiles set membership = 'platinum' where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  'permission denied for table profiles',
  'mobile role cannot update membership directly'
);
select throws_ok(
  $$update public.profiles set full_name = 'Bypass RPC' where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  'permission denied for table profiles',
  'mobile role cannot update even allowed fields directly'
);
select throws_ok(
  $$delete from public.profiles where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  'permission denied for table profiles',
  'mobile role cannot delete profiles directly'
);
select lives_ok(
  $$select public.update_my_profile('Updated User A', '+62 811 1111 111', 'https://example.test/avatar.png', true, 'pro')$$,
  'allowlisted profile RPC succeeds for the current user'
);
select is((select full_name from public.profiles), 'Updated User A', 'RPC updates full_name');
select is((select phone from public.profiles), '+628111111111', 'RPC normalizes and updates phone');
select is((select avatar_url from public.profiles), 'https://example.test/avatar.png', 'RPC updates avatar_url');
select is((select onboarding_completed from public.profiles), true, 'RPC updates onboarding completion');
select is((select upgrade_intent::text from public.profiles), 'pro', 'RPC records a non-binding upgrade intent');
select is((select membership::text from public.profiles), 'basic', 'upgrade intent does not activate paid membership');
select is((select role::text from public.profiles), 'member', 'RPC cannot change the protected role');
select is((select kyc_status::text from public.profiles), 'unverified', 'RPC cannot change protected KYC status');
select is((select referred_by from public.profiles), null::uuid, 'RPC cannot change referral attribution');
select is(
  (
    select count(*)
    from pg_proc p
    cross join lateral unnest(p.proargnames) arg_name
    where p.oid = 'public.update_my_profile(text,text,text,boolean,public.membership_level)'::regprocedure
      and arg_name = any (array['membership', 'membership_level', 'role', 'kyc_status', 'xavi_points', 'referred_by', 'referral_code'])
  ),
  0::bigint,
  'RPC exposes no sensitive profile parameters'
);
select set_config('search_path', 'attacker, public, extensions', true);
select extensions.lives_ok(
  $$select public.update_my_profile('Search Path Safe', '+628111111111', null, true, null)$$,
  'RPC cannot be redirected to an attacker schema through search_path'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select * from public.profiles$$,
  '42501',
  'permission denied for table profiles',
  'anonymous clients cannot read profiles'
);
select throws_ok(
  $$select public.update_my_profile('Anonymous', '+628123456789', null, false, null)$$,
  '42501',
  'permission denied for function update_my_profile',
  'anonymous clients cannot execute the profile RPC'
);

reset role;
select * from finish();
rollback;
