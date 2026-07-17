# XAVI-OS MVP

Installable Android/iOS MVP for the Xavindo personal and business ecosystem.

## Included flows

- Midnight Ecosystem onboarding
- Registration with referral code
- Basic, Pro, Premium, and Platinum membership selection
- Personal and Business Space switcher
- Marketplace and product details
- Home Service, website, mobile commerce, AI, clinic, and CRM templates
- Demo checkout and payment success
- Referral code, referral list, commission balance, and withdrawal UI
- XAVI AI personal/business entry point
- Account and business workspace menu

## Run locally

Requirements: Node.js LTS and Expo Go on the phone.

```bash
npm install
npm start
```

Scan the QR code using Expo Go. For native builds:

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

iOS cloud builds require an Apple Developer account. Publishing requires Play
Console and Apple Developer accounts owned by Xavindo.

## Demo safety

The MVP currently uses local demo data. Checkout does not move money. Do not
place Supabase service-role keys or payment server keys in the mobile app.

## Backend setup

1. Create a new Supabase project.
2. Review and run `supabase/schema.sql` in a development project.
3. Copy `.env.example` to `.env` and fill public client values only.
4. Implement server/Edge Functions before enabling payment or commissions.
5. Choose a licensed payment/payout provider and complete business verification.

See `docs/ARCHITECTURE.md` for production rules and rollout phases.
