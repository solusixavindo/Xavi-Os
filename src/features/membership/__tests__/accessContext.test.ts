import {
  accessibleWorkspaces,
  getLockedFeatureState,
  isAccessContextStale,
  parseAccessContext,
  resolveActiveWorkspaceId,
  type AccessContext,
} from '../accessContext';

const personalId = '10000000-0000-4000-8000-000000000001';
const businessId = '20000000-0000-4000-8000-000000000002';

type RawWorkspace = {
  id: string;
  kind: 'personal' | 'business';
  name: string;
  slug: string;
  role: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type RawAccessContextFixture = {
  context_version: number;
  server_timestamp: string;
  active_membership_plan: string;
  subscription: { status: string; period_start: string | null; period_end: string | null };
  entitlements: Record<string, boolean | number>;
  numeric_limits: Record<string, number>;
  personal_workspace: RawWorkspace | null;
  business_workspaces: RawWorkspace[];
  locked_feature_reasons: Record<string, string | null>;
};

function workspace(id: string, kind: 'personal' | 'business', archivedAt: string | null = null): RawWorkspace {
  return {
    id,
    kind,
    name: kind === 'personal' ? 'Personal Space' : 'Business One',
    slug: kind === 'personal' ? 'personal-space' : 'business-one',
    role: 'owner',
    archived_at: archivedAt,
    created_at: '2026-07-18T09:00:00.000Z',
    updated_at: '2026-07-18T09:00:00.000Z',
  };
}

function rawContext(): RawAccessContextFixture {
  return {
    context_version: 1,
    server_timestamp: '2026-07-18T09:05:00.000Z',
    active_membership_plan: 'basic',
    subscription: { status: 'default_basic', period_start: null, period_end: null },
    entitlements: {
      personal_workspace: true,
      business_workspace: false,
      business_workspace_limit: 0,
    },
    numeric_limits: { business_workspace_limit: 0 },
    personal_workspace: workspace(personalId, 'personal'),
    business_workspaces: [],
    locked_feature_reasons: { business_workspace: 'membership_upgrade_required' },
  };
}

describe('membership access context', () => {
  test('validates and maps the canonical RPC response', () => {
    const context = parseAccessContext(rawContext());
    expect(context.activeMembershipPlan).toBe('basic');
    expect(context.subscription.status).toBe('default_basic');
    expect(context.personalWorkspace?.id).toBe(personalId);
  });

  test('preserves boolean entitlements and numeric limits', () => {
    const context = parseAccessContext(rawContext());
    expect(context.entitlements.personal_workspace).toBe(true);
    expect(context.numericLimits.business_workspace_limit).toBe(0);
  });

  test('returns the server-provided locked reason for Basic', () => {
    expect(getLockedFeatureState(parseAccessContext(rawContext()), 'business_workspace')).toEqual({
      locked: true,
      reason: 'membership_upgrade_required',
    });
  });

  test('does not unlock a feature from local workspace selection', () => {
    const context = parseAccessContext(rawContext());
    expect(resolveActiveWorkspaceId(context, businessId)).toBe(personalId);
    expect(getLockedFeatureState(context, 'business_workspace').locked).toBe(true);
  });

  test('accepts a server entitlement as the only unlock source', () => {
    const value = rawContext();
    value.active_membership_plan = 'pro';
    value.entitlements.business_workspace = true;
    value.entitlements.business_workspace_limit = 1;
    value.numeric_limits.business_workspace_limit = 1;
    value.business_workspaces = [workspace(businessId, 'business')];
    value.locked_feature_reasons.business_workspace = null;
    expect(getLockedFeatureState(parseAccessContext(value), 'business_workspace')).toEqual({ locked: false });
  });

  test('keeps a requested workspace only when it exists in current server context', () => {
    const value = rawContext();
    value.active_membership_plan = 'pro';
    value.business_workspaces = [workspace(businessId, 'business')];
    const context = parseAccessContext(value);
    expect(resolveActiveWorkspaceId(context, businessId)).toBe(businessId);
    expect(resolveActiveWorkspaceId(context, '30000000-0000-4000-8000-000000000003')).toBe(personalId);
  });

  test('filters archived workspaces from active selection', () => {
    const value = rawContext();
    value.business_workspaces = [workspace(businessId, 'business', '2026-07-18T10:00:00.000Z')];
    const context = parseAccessContext(value);
    expect(accessibleWorkspaces(context).map((item) => item.id)).toEqual([personalId]);
    expect(resolveActiveWorkspaceId(context, businessId)).toBe(personalId);
  });

  test('marks old and implausibly future contexts stale', () => {
    const context = parseAccessContext(rawContext());
    expect(isAccessContextStale(context, Date.parse('2026-07-18T09:09:00.000Z'))).toBe(false);
    expect(isAccessContextStale(context, Date.parse('2026-07-18T09:11:00.001Z'))).toBe(true);
    expect(isAccessContextStale(context, Date.parse('2026-07-18T09:03:00.000Z'))).toBe(true);
  });

  test.each([
    ['unknown plan', { active_membership_plan: 'founder' }],
    ['invalid numeric limit', { numeric_limits: { business_workspace_limit: -1 } }],
    ['wrong personal kind', { personal_workspace: workspace(personalId, 'business') }],
    ['wrong business kind', { business_workspaces: [workspace(businessId, 'personal')] }],
    ['invalid role', { personal_workspace: { ...workspace(personalId, 'personal'), role: 'superadmin' } }],
  ])('rejects %s responses', (_name, patch) => {
    expect(() => parseAccessContext({ ...rawContext(), ...patch })).toThrow();
  });

  test('uses a safe default reason for unknown locked entitlements', () => {
    expect(getLockedFeatureState(parseAccessContext(rawContext()), 'unknown_feature')).toEqual({
      locked: true,
      reason: 'entitlement_required',
    });
  });

  test('treats a missing access context as outside the domain contract', () => {
    expect(() => parseAccessContext(null as unknown as AccessContext)).toThrow();
  });
});
