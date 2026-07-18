# XAVI-OS Architecture

## Mobile boundary

- Expo SDK 54, React Native, and TypeScript strict mode
- React Navigation auth guards derived from validated Supabase state
- Only the Supabase URL and an `sb_publishable_` key are available to the mobile bundle
- Secret keys, service-role JWTs, and legacy anon JWTs are rejected by environment validation
- Supabase sessions use encrypted, chunked SecureStore persistence on Android/iOS
- Token refresh runs only while the native app is active
- Auth URLs use PKCE and the `xavi-os://` custom scheme

## Stage 2 route state

1. Restore and validate the stored session.
2. No session: render the Auth stack.
3. Unverified email or pending signup: render Verification.
4. Verified user with incomplete profile: render Onboarding.
5. Verified user with completed profile: render Main tabs.
6. Password recovery callback: render the password update screen.

Changing local screen state cannot grant access to Main tabs.

## Profile security

- `auth.users` is the identity source of truth.
- A `SECURITY DEFINER` trigger creates one profile for each Auth user.
- Every new account starts as Basic with zero points and an unverified KYC status.
- Referral attribution is resolved by the trigger and is immutable.
- Authenticated users can select only their own profile under RLS.
- The mobile role has no direct insert, update, or delete privilege on profiles.
- `update_my_profile` accepts only name, phone, avatar, onboarding completion, and a
  non-binding paid-membership upgrade intent.
- Membership, points, role, KYC, referral code, and referrer remain server-managed.

## Stage 3A access boundary

- Effective membership derives from server-managed subscriptions with Basic fallback.
- `profiles.membership` is a protected projection, not an authorization source.
- Personal Workspace provisioning is an idempotent post-onboarding RPC, not an auth trigger.
- Business Workspace creation, roles, limits, and archive state are checked by RPC.
- `get_my_access_context()` is the mobile access contract; local workspace selection never
  grants authorization.
- See [STAGE_3A_MEMBERSHIP_WORKSPACES.md](STAGE_3A_MEMBERSHIP_WORKSPACES.md).
- The final dashboard remains gated by
  [STAGE_3B_PERSONAL_DASHBOARD_REQUIREMENTS.md](STAGE_3B_PERSONAL_DASHBOARD_REQUIREMENTS.md).

## Deferred boundaries

- Hosted migration and final Personal Dashboard integration: separate Stage 3 gates
- Marketplace database and server-calculated orders: Stage 4
- Xendit Test Mode and verified payment state: Stages 5–6
- Commission, refunds, and withdrawals: Stages 7–9

The mobile app will never mark an order paid or receive a server secret.
