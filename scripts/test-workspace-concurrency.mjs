import { spawn, spawnSync } from 'node:child_process';

const userId = '88000000-0000-4000-8000-000000000008';

function dockerPsql(sql) {
  return spawnSync(
    'docker',
    ['exec', '-i', 'supabase_db_XAVI-OS', 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql],
    { encoding: 'utf8' },
  );
}

function concurrentCall(name, slug) {
  const sql = `
    begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    select public.create_business_workspace('${name}', '${slug}');
    commit;
  `;
  return new Promise((resolve) => {
    const child = spawn(
      'docker',
      ['exec', '-i', 'supabase_db_XAVI-OS', 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => resolve({ code, limitRejected: stderr.includes('business_workspace_limit_reached') }));
  });
}

const setup = dockerPsql(`
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '${userId}', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'workspace-concurrency@example.test', 'test-only', '{}',
    '{"full_name":"Concurrency Test","phone":"+628888888880","terms_accepted":true,"terms_version":"2026-07-17","privacy_version":"2026-07-17"}', now(), now()
  );
  update public.profiles set onboarding_completed = true where id = '${userId}';
  insert into public.subscriptions (user_id, plan_code, status, period_start, period_end, activated_at)
  values ('${userId}', 'pro', 'active', now() - interval '1 minute', now() + interval '1 day', now());
`);

if (setup.status !== 0) throw new Error('Concurrency test setup failed. Reset the local database before retrying.');

try {
  const results = await Promise.all([
    concurrentCall('Concurrent Workspace A', 'concurrent-workspace-a'),
    concurrentCall('Concurrent Workspace B', 'concurrent-workspace-b'),
  ]);
  const successCount = results.filter((result) => result.code === 0).length;
  const limitRejectionCount = results.filter((result) => result.code !== 0 && result.limitRejected).length;
  const counts = dockerPsql(`
    select concat_ws(':',
      (select count(*) from public.workspaces where owner_id = '${userId}' and kind = 'business' and archived_at is null),
      (select count(*) from public.workspace_members wm join public.workspaces w on w.id = wm.workspace_id where w.owner_id = '${userId}' and w.kind = 'business' and wm.user_id = '${userId}' and wm.role = 'owner'),
      (select count(*) from public.access_audit_events where subject_user_id = '${userId}' and event_type = 'business_workspace_created')
    );
  `);
  const [workspaceCount, ownerMemberCount, auditCount] = counts.stdout.trim().split(':').map(Number);
  const passed =
    successCount === 1 &&
    limitRejectionCount === 1 &&
    counts.status === 0 &&
    workspaceCount === 1 &&
    ownerMemberCount === 1 &&
    auditCount === 1;
  if (!passed) throw new Error('Concurrent workspace limit test failed.');
  process.stdout.write(
    JSON.stringify({ passed, concurrentRequests: 2, successCount, limitRejectionCount, workspaceCount, ownerMemberCount, auditCount }) + '\n',
  );
} finally {
  dockerPsql(`
    delete from public.access_audit_events where subject_user_id = '${userId}' or actor_user_id = '${userId}';
    delete from auth.users where id = '${userId}';
  `);
}
