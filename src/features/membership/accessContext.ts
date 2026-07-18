import { z } from 'zod';

import { membershipLevels, type MembershipLevel } from '../profile/model';
import { isActiveWorkspace, workspaceResponseSchema, type Workspace } from '../workspaces/models';

export type EntitlementValue = boolean | number;

export type AccessContext = {
  contextVersion: 1;
  serverTimestamp: string;
  activeMembershipPlan: MembershipLevel;
  subscription: {
    status: 'default_basic' | 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'revoked';
    periodStart: string | null;
    periodEnd: string | null;
  };
  entitlements: Record<string, EntitlementValue>;
  numericLimits: Record<string, number>;
  personalWorkspace: Workspace | null;
  businessWorkspaces: Workspace[];
  lockedFeatureReasons: Record<string, string | null>;
};

const timestampSchema = z.string().datetime({ offset: true });
const subscriptionStatusSchema = z.enum(['default_basic', 'pending', 'active', 'past_due', 'cancelled', 'expired', 'revoked']);

export const accessContextResponseSchema = z
  .object({
    context_version: z.literal(1),
    server_timestamp: timestampSchema,
    active_membership_plan: z.enum(membershipLevels),
    subscription: z.object({
      status: subscriptionStatusSchema,
      period_start: timestampSchema.nullable(),
      period_end: timestampSchema.nullable(),
    }),
    entitlements: z.record(z.string(), z.union([z.boolean(), z.number().int().nonnegative()])),
    numeric_limits: z.record(z.string(), z.number().int().nonnegative()),
    personal_workspace: workspaceResponseSchema.nullable(),
    business_workspaces: z.array(workspaceResponseSchema),
    locked_feature_reasons: z.record(z.string(), z.string().min(1).max(80).nullable()),
  })
  .superRefine((value, context) => {
    if (value.personal_workspace?.kind === 'business') {
      context.addIssue({ code: 'custom', path: ['personal_workspace'], message: 'invalid_personal_workspace_kind' });
    }
    if (value.business_workspaces.some((workspace) => workspace.kind !== 'business')) {
      context.addIssue({ code: 'custom', path: ['business_workspaces'], message: 'invalid_business_workspace_kind' });
    }
  })
  .transform(
    (value): AccessContext => ({
      contextVersion: value.context_version,
      serverTimestamp: value.server_timestamp,
      activeMembershipPlan: value.active_membership_plan,
      subscription: {
        status: value.subscription.status,
        periodStart: value.subscription.period_start,
        periodEnd: value.subscription.period_end,
      },
      entitlements: value.entitlements,
      numericLimits: value.numeric_limits,
      personalWorkspace: value.personal_workspace,
      businessWorkspaces: value.business_workspaces,
      lockedFeatureReasons: value.locked_feature_reasons,
    }),
  );

export function parseAccessContext(input: unknown): AccessContext {
  return accessContextResponseSchema.parse(input);
}

export function isAccessContextStale(context: AccessContext, now = Date.now(), maxAgeMs = 5 * 60_000): boolean {
  const serverTime = Date.parse(context.serverTimestamp);
  if (!Number.isFinite(serverTime)) return true;
  return serverTime > now + 60_000 || now - serverTime > maxAgeMs;
}

export function accessibleWorkspaces(context: AccessContext): Workspace[] {
  return [context.personalWorkspace, ...context.businessWorkspaces].filter(
    (workspace): workspace is Workspace => workspace !== null && isActiveWorkspace(workspace),
  );
}

export function resolveActiveWorkspaceId(context: AccessContext, requestedId: string | null): string | null {
  const workspaces = accessibleWorkspaces(context);
  if (requestedId && workspaces.some((workspace) => workspace.id === requestedId)) return requestedId;
  return workspaces[0]?.id ?? null;
}

export type LockedFeatureState = { locked: false } | { locked: true; reason: string };

export function getLockedFeatureState(context: AccessContext, entitlementKey: string): LockedFeatureState {
  if (context.entitlements[entitlementKey] === true) return { locked: false };
  return {
    locked: true,
    reason: context.lockedFeatureReasons[entitlementKey] ?? 'entitlement_required',
  };
}
