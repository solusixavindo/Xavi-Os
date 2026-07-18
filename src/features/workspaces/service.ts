import type { SupabaseClient } from '@supabase/supabase-js';

import { workspaceInputSchema, workspaceResponseSchema, type Workspace, type WorkspaceRole } from './models';

function parseWorkspace(data: unknown): Workspace {
  return workspaceResponseSchema.parse(data);
}

function workspaceServiceError(): Error {
  return new Error('Workspace belum dapat diproses. Silakan coba kembali.');
}

export async function ensurePersonalWorkspace(client: SupabaseClient): Promise<Workspace> {
  const { data, error } = await client.rpc('ensure_my_personal_workspace');
  if (error) throw workspaceServiceError();
  return parseWorkspace(data);
}

export async function createBusinessWorkspace(
  client: SupabaseClient,
  input: { name: string; slug: string },
): Promise<Workspace> {
  const value = workspaceInputSchema.parse(input);
  const { data, error } = await client.rpc('create_business_workspace', {
    p_name: value.name,
    p_slug: value.slug,
  });
  if (error) throw workspaceServiceError();
  return parseWorkspace(data);
}

export async function updateWorkspace(
  client: SupabaseClient,
  workspaceId: string,
  input: { name: string; slug: string },
): Promise<Workspace> {
  const value = workspaceInputSchema.parse(input);
  const { data, error } = await client.rpc('update_workspace', {
    p_workspace_id: zodUuid(workspaceId),
    p_name: value.name,
    p_slug: value.slug,
  });
  if (error) throw workspaceServiceError();
  return parseWorkspace(data);
}

export async function archiveWorkspace(client: SupabaseClient, workspaceId: string): Promise<Workspace> {
  const { data, error } = await client.rpc('archive_workspace', { p_workspace_id: zodUuid(workspaceId) });
  if (error) throw workspaceServiceError();
  return parseWorkspace(data);
}

export async function setWorkspaceMemberRole(
  client: SupabaseClient,
  workspaceId: string,
  userId: string,
  role: Exclude<WorkspaceRole, 'owner'>,
): Promise<void> {
  const { error } = await client.rpc('set_workspace_member_role', {
    p_workspace_id: zodUuid(workspaceId),
    p_user_id: zodUuid(userId),
    p_role: role,
  });
  if (error) throw workspaceServiceError();
}

function zodUuid(value: string): string {
  const parsed = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if (!parsed) throw new Error('Workspace identifier tidak valid.');
  return value;
}
