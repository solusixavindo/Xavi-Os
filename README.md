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
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Never place a Supabase service-role key, database password, Xendit key, or another
server secret in an Expo environment variable.

Run the checks:

```bash
npm run typecheck
npm run lint
npm test
```

Start the app with `npm start`. A development build is required to test the stable
`xavi-os://` email verification and password recovery callbacks.

## Database

Do not use the deleted MVP `supabase/schema.sql`. Apply versioned migrations to a
development Supabase project only after review:

```text
supabase/migrations/20260717160000_auth_profiles.sql
```

See [docs/SUPABASE_AUTH_SETUP.md](docs/SUPABASE_AUTH_SETUP.md) before connecting a project.
