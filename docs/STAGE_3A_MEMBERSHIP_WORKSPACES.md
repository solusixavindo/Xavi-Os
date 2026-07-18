# Stage 3A — Membership Entitlement and Workspace Foundation

## Server authority

Membership and workspace authorization are server decisions. Mobile may cache an access
context and preferred active workspace for UX, but neither grants access. Sensitive RPCs
derive `auth.uid()`, effective subscription, entitlement, role, active workspace state,
and limits again in PostgreSQL.

`profiles.membership` is a protected projection for display/compatibility. The effective
plan comes from a currently active subscription; otherwise it is Basic.
`profiles.upgrade_intent` is non-binding and never creates a subscription or entitlement.

## Canonical technical matrix

| Plan | Personal Workspace | Business Workspace | Active owned Business Workspace limit |
| --- | ---: | ---: | ---: |
| Basic | Yes | No | 0 |
| Pro | Yes | Yes | 1 |
| Premium | Yes | Yes | 3 |
| Platinum | Yes | Yes | 10 |

These are the only Stage 3A security entitlements because they are explicit and
consistent in the approved MVP source.

### Business decisions pending

The following existed only as demo claims or lack an approved specification and are not
security rules or production benefits:

- paid plan prices, billing periods, trials, renewal, proration, grace, and cancellation;
- discounts, cashback, points, rewards, and commission rates;
- XAVI AI credits or quotas;
- CRM, POS, inventory, ERP, automation, and academy packaging;
- transaction, storage, seat, and team-member limits;
- premium support scope or SLA.

## Schema and relations

- `membership_plans`: four canonical identifiers; deliberately no price fields.
- `entitlement_definitions`: typed boolean/integer entitlement registry.
- `plan_entitlements`: versioned plan values with server-enforced value type.
- `subscriptions`: paid lifecycle (`pending`, `active`, `past_due`, `cancelled`,
  `expired`, `revoked`) and effective period.
- `workspaces`: Personal/Business kind, owner, validated name/slug, archive state.
- `workspace_members`: workspace-scoped `owner`, `admin`, `member`, `viewer`.
- `access_audit_events`: append-only sensitive membership/workspace events.

```text
auth.users ──1 profiles
     ├──< subscriptions >── membership_plans ──< plan_entitlements >── entitlement_definitions
     ├──< workspaces (owner) ──< workspace_members >── auth.users
     └──< access_audit_events (actor/subject)
```

There is no balance, payment, commission, wallet, withdrawal, referral ledger, or order
table. `user_entitlement_overrides` is omitted until an auditable use case exists.

## Subscription lifecycle

Basic is the implicit fallback and needs no synthetic subscription. Paid membership is
effective only when a server-created subscription is `active`, its period has started,
its end has not passed, and the plan is active. A partial unique index prevents two active
paid subscriptions per user. Subscription changes update `profiles.membership` and append
an audit event, but authorization still derives the effective subscription.

A future verified payment webhook may transition subscription rows. Mobile must never do so.

## Workspace ownership and roles

Platform role and workspace role are separate domains.

- `owner`: protected owner; manages non-owner roles and archives a Business Workspace.
- `admin`: updates an active workspace and manages only member/viewer roles.
- `member`: participates but cannot manage workspace or roles.
- `viewer`: read-only.

Clients have no direct membership/workspace DML. Owners cannot be downgraded or removed.
Archived workspaces are excluded by RLS/access context and cannot be active. Invitation
workflow is intentionally not implemented.

## Personal Workspace provisioning

`ensure_my_personal_workspace()` is an authenticated, idempotent post-onboarding RPC. A
per-user transaction advisory lock plus unique index guarantees one Personal Workspace.
Retry repairs missing owner membership and does not duplicate the workspace.

Provisioning is not part of `handle_new_auth_user()`, keeping signup isolated from workspace
failures. Account deletion cascades owned workspaces; future anonymization/retention policy
must be approved before production deletion workflows.

## RPC surface and security

- `get_my_access_context()` — parameterless canonical context for `auth.uid()`.
- `ensure_my_personal_workspace()` — idempotent post-onboarding provisioning.
- `create_business_workspace(name, slug)` — entitlement and limit checked server-side.
- `update_workspace(id, name, slug)` — active owner/admin only.
- `archive_workspace(id)` — active Business Workspace owner only.
- `set_workspace_member_role(...)` and `remove_workspace_member(...)` — protected changes.

Public RPCs are authenticated-only `SECURITY DEFINER`, use `search_path = ''`, qualify
objects, validate parameters, and never accept membership/platform role as authorization.
Internal `private.*` functions are not executable by `anon` or `authenticated`.

## Access-context contract v1

```text
context_version, server_timestamp, active_membership_plan,
subscription { status, period_start, period_end },
entitlements { key: boolean | integer },
numeric_limits { key: non-negative integer },
personal_workspace, business_workspaces[] with current role,
locked_feature_reasons
```

It accepts no user ID. A Basic context explicitly returns
`membership_upgrade_required` for Business Workspace.

## Mobile boundary

Zod validates all RPC responses. The domain layer exposes loading, error, empty, stale,
locked, and active-workspace state. An unknown/removed/archived local selection falls back
to an accessible workspace. Local state cannot unlock a feature.

`AccessProvider` is not mounted in production navigation until the migration is reviewed
and applied to development. Stage 3B may mount it after that hosted gate.

## RLS and grants

- `anon` cannot read membership/workspace data or execute access RPCs.
- authenticated users read only their subscription and own workspace memberships.
- workspace reads require membership and active state.
- plan/entitlement configuration and audit events have no mobile table grants.
- all sensitive direct DML is revoked from authenticated.
- `service_role` has explicit backend privileges.

Local pgTAP covers Basic fallback, upgrade-intent isolation, retry provisioning, RLS,
grants, cross-user/workspace isolation, roles, owner protection, limits, archive behavior,
audit events, and SECURITY DEFINER hardening.
