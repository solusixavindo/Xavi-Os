# Android EAS Development Build Preparation

This project is linked only to the following EAS identity:

```text
Organization: xavindos-team
Project: @xavindos-team/xavi-os
Project ID: 41d8aade-8d36-46d7-933c-e8e787ef3c59
Android package: com.xavindo.xavios
Custom scheme: xavi-os
```

## Development profile

The `development` profile in `eas.json` is prepared for an internally distributed
Android development client APK. Preparing the profile does not create a build, keystore,
submission, or store release.

Do not run a build until the generated branding assets and environment checklist below
have been reviewed and the project owner has given explicit approval.

## EAS development environment

The ignored local `.env` is not a source-controlled cloud environment. Before a future
approved build, configure these two public variables in the EAS `development`
environment using the Expo Dashboard or approved EAS environment workflow:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Enter the values directly in EAS. Do not send a key through chat and do not copy the
local `.env` into the repository. Never add a Supabase secret/service-role key, database
password, connection string, Xendit credential, signing credential, or Android keystore
to the Expo public environment.

No EAS environment variable is created by this preparation step.

## Native configuration audit

- The generated native intent filter accepts `xavi-os://...`. The development client also adds its internal `exp+xavi-os` launcher scheme; this is development tooling, not an application callback.
- The application source accepts only `xavi-os://auth/callback` and `xavi-os://auth/reset-password`. Other paths are rejected by the auth deep-link handler.
- Legacy external-storage permissions, vibration, and the overlay permission are explicitly blocked from the application manifest because XAVI-OS does not need them in this stage.
- `INTERNET` is required. A debug development client can re-add `SYSTEM_ALERT_WINDOW` from React Native's debug-only manifest; it is development tooling and must not be present in a production release manifest.

## Branding assets

Approved Ecosystem X references and deterministic production derivatives are stored under
`assets/brand/`. Run `npm run brand:check` before a future build. The reference artwork is
preserved, Android safe-zone and monochrome variants are generated, and native splash uses
Midnight Navy `#050B18`. The generated assets still require owner visual review before the
first shared build.

## Deferred build command

The future command, only after separate approval and credential/branding review, is:

```text
eas build --platform android --profile development
```

Do not run it as part of preparation.
