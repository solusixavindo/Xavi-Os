# Supabase Auth Setup — Stage 2

This checklist is for the hosted development project only:

```text
Project name: XAVI-OS Development
Project reference: bouxqdjongalkkbvcchm
Project URL: https://bouxqdjongalkkbvcchm.supabase.co
```

Do not apply these steps to a production project. Do not select `xaviklinika` or
`klinik apps` when following this guide.

## 1. Local mobile environment

Supabase recommends a publishable key for browser, mobile, and desktop clients. In the
Dashboard, open **Project Settings → API Keys → Publishable and secret API keys**. Copy
only the value labeled **Publishable key**; its format starts with `sb_publishable_`.

Create an ignored local `.env` from `.env.example` and enter the values yourself:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://bouxqdjongalkkbvcchm.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from the Dashboard>
```

Do not send the key through chat. Do not put a secret key, service-role key, legacy JWT,
database password, access token, connection string, or Xendit credential in Expo config.
The application intentionally has no compatibility fallback for those key types.

Reference: [Migrating to publishable API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys).

## 2. Database migration status

The versioned migration is:

```text
supabase/migrations/20260717160000_auth_profiles.sql
```

Local and hosted development migration history must stay synchronized. Never run the
deleted MVP `supabase/schema.sql`, a hosted database reset, or a manual Dashboard SQL
replacement for this migration.

## 3. Dashboard URL Configuration checklist

These are manual Dashboard steps. The application and CLI do not change these settings
automatically.

Open **Authentication → URL Configuration** in `XAVI-OS Development`, then verify:

- [ ] **Site URL** is exactly `xavi-os://auth/callback` for this mobile development project.
- [ ] **Redirect URLs** contains exactly `xavi-os://auth/callback`.
- [ ] **Redirect URLs** contains exactly `xavi-os://auth/reset-password`.
- [ ] No wildcard such as `xavi-os://**` is used.
- [ ] No redirect belonging to another application or Supabase project is present.

The source accepts only these routes:

- `xavi-os://auth/callback` for signup/email confirmation;
- `xavi-os://auth/reset-password` for password recovery.

An explicit recovery type on the signup callback, an explicit signup type on the reset
path, another scheme/host/path, or a provider error cannot establish a trusted route.
Provider errors are replaced with a generic message and every resulting session is
validated with `getUser()`.

Reference: [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 4. Dashboard Email provider checklist

Open **Authentication → Sign In / Providers → Email**, then verify:

- [ ] Email provider is enabled.
- [ ] Email and password sign-up is enabled.
- [ ] **Confirm Email** remains enabled; do not disable email verification.
- [ ] Secure email change remains enabled.
- [ ] Secure password change or reauthentication protection is enabled if the option is
      available for the project plan and Dashboard version.
- [ ] Password recovery remains available and the recovery email template is enabled.
- [ ] Phone/SMS authentication remains disabled for Stage 2.
- [ ] The minimum password policy is at least eight characters; enable leaked-password
      protection when available.

Supabase's default hosted email sender is intended only for limited testing, is delivered
on a best-effort basis, and currently has a low rate limit. Configure a custom SMTP
provider before production and validate its sending domain, SPF/DKIM, bounce handling,
and delivery logs.

References:

- [Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
- [Password security](https://supabase.com/docs/guides/auth/password-security)
- [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)

## 5. Email template and redirect review

In **Authentication → Email Templates**, review at least **Confirm signup** and
**Reset password**. Keep Supabase's verification endpoint and token handling intact.
When a template needs the redirect selected by the client, use the supported
`{{ .RedirectTo }}` or `{{ .ConfirmationURL }}` variables rather than constructing a
custom token URL from untrusted values.

Do not send a test email or create a test user during configuration preparation.

## 6. Development-build requirement

The Expo app registers the `xavi-os` scheme in `app.json`. A development build or
standalone app is required for reliable Android/iOS custom-scheme verification. Expo Go
must not be treated as sufficient evidence for complete deep-link UAT.

When UAT is separately approved, verify confirmation and recovery on both platforms.
Do not perform that UAT as part of this configuration-preparation step.

Reference: [Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
