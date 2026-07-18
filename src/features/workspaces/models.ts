import { z } from 'zod';

export const workspaceKinds = ['personal', 'business'] as const;
export const workspaceRoles = ['owner', 'admin', 'member', 'viewer'] as const;

export type WorkspaceKind = (typeof workspaceKinds)[number];
export type WorkspaceRole = (typeof workspaceRoles)[number];

export type Workspace = {
  id: string;
  kind: WorkspaceKind;
  name: string;
  slug: string;
  role: WorkspaceRole;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const workspaceResponseSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(workspaceKinds),
    name: z.string().trim().min(2).max(80),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(48),
    role: z.enum(workspaceRoles),
    archived_at: z.string().datetime({ offset: true }).nullable(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .transform(
    (value): Workspace => ({
      id: value.id,
      kind: value.kind,
      name: value.name,
      slug: value.slug,
      role: value.role,
      archivedAt: value.archived_at,
      createdAt: value.created_at,
      updatedAt: value.updated_at,
    }),
  );

export const workspaceInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(48),
});

export function isActiveWorkspace(workspace: Workspace): boolean {
  return workspace.archivedAt === null;
}
