# Supabase Auth Setup — Stage 2

Apply these steps to a development or staging Supabase project first. Do not use a
production project until migration and RLS tests pass.

## 1. Project and mobile environment

1. Create or select the XAVI-OS development project.
2. Copy the Project URL and the public anon/publishable key from the Connect dialog.
3. Put them in the local ignored `.env` using the names in `.env.example`.
4. Never copy the service-role key or database password into the Expo project.

## 2. Database migration

Review and apply `supabase/migrations/20260717160000_auth_profiles.sql` through a
controlled migration workflow. Do not run the former MVP schema.

Before connecting the mobile app, run `supabase test db` in an environment with the
Supabase CLI and Docker. The pgTAP suite verifies Basic defaults, referral behavior,
RLS isolation, RPC allowlisting, and anonymous denial.

## 3. Auth provider

In Authentication → Providers → Email:

- enable email/password sign-up;
- require email confirmation;
- keep phone authentication disabled for Stage 2;
- configure an appropriate minimum password policy and leaked-password protection;
- configure custom SMTP before production use.

The built-in trial email sender is not a production delivery service.

## 4. URL configuration

In Authentication → URL Configuration, add these exact Redirect URLs:

```text
xavi-os://auth/callback
xavi-os://auth/reset-password
```

Set the Site URL to an HTTPS page owned by Xavindo. Do not use a wildcard redirect for
production. Ensure confirmation and recovery templates preserve `{{ .ConfirmationURL }}`
so Supabase can validate the token before returning to the application.

## 5. Device verification

Create a development build after adding the `xavi-os` scheme and SecureStore plugin.
Test on both Android and iOS:

- register and receive a confirmation email;
- open the confirmation callback;
- close/reopen the app and confirm the session persists;
- request a password reset and set a new password;
- sign out and confirm protected tabs cannot be recovered with the Back button.

Expo Go does not provide a stable production custom-scheme environment for these tests.
