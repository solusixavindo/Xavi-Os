# XAVI-OS

Expo React Native application for the Xavindo personal and business ecosystem.

## Current stage

Stage 2 implements the production authentication foundation:

- Supabase email/password authentication
- Email verification and resend flow
- Forgot/reset password deep links
- Encrypted, chunked session persistence on Android/iOS
- Protected auth, verification, onboarding, and main routes
- Server-created profiles with Basic membership
- Profile RLS and allowlisted profile update RPC

Marketplace products remain a clearly marked development seed until Stage 4. Payments,
paid membership activation, commissions, withdrawals, and Xendit are not enabled.

## Local setup

```bash
npm install
cp .env.example .env
```

Fill only the two public mobile values in `.env`:

```text
EXPO_PUBLIC_SUPABASE_URL=https://bouxqdjongalkkbvcchm.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<copy the sb_publishable_ value locally>
```

`EXPO_PUBLIC_SUPABASE_URL` must be the root Project URL from Supabase Connect/API
settings (`https://<project-ref>.supabase.co`). Do not use a REST or Auth endpoint,
including URLs ending in `/rest/v1`, `/rest_v1`, or `/auth/v1`.

Copy the publishable key directly from the XAVI-OS Development Dashboard into the
ignored local `.env`; do not send it through chat or commit it. The mobile configuration
accepts only the `sb_publishable_` format. Never place a Supabase secret/service-role
key, legacy key, database password, Xendit key, or another server secret in an Expo
environment variable.

Run the checks:

```bash
npm run typecheck
npm run lint
npm test
```

Start the app with `npm start`. A development build is required to test the stable
`xavi-os://` email verification and password recovery callbacks. Expo Go is useful for
basic UI development but is not sufficient for complete custom-scheme Auth UAT.

## Database

Do not use the deleted MVP `supabase/schema.sql`. Apply versioned migrations to a
development Supabase project only after review:

```text
supabase/migrations/20260717160000_auth_profiles.sql
```

See [docs/SUPABASE_AUTH_SETUP.md](docs/SUPABASE_AUTH_SETUP.md) before connecting a project.

Android development-client and EAS environment preparation is documented in
[docs/EAS_DEVELOPMENT_BUILD.md](docs/EAS_DEVELOPMENT_BUILD.md). The development build
must not be started until branding assets and cloud environment configuration are reviewed.

Ecosystem X production assets are reproducible with `npm run brand:generate` and validated
with `npm run brand:check`. The approved reference files remain under `assets/brand/reference/`.
See [docs/ECOSYSTEM_X_BRANDING.md](docs/ECOSYSTEM_X_BRANDING.md) for the asset map, safe-zone
rules, and startup animation behavior.
