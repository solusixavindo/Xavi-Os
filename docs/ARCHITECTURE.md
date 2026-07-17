# XAVI-OS MVP Architecture

## Mobile

- Expo React Native, TypeScript
- One codebase for Android and iOS
- Demo data is local for the first installable prototype
- Personal and Business Space share one authenticated identity

## Backend target

- Supabase Auth for email/phone authentication
- PostgreSQL with Row Level Security
- Supabase Storage for business assets
- Edge Functions for referral calculation and trusted payment callbacks
- A licensed Indonesian payment gateway for QRIS, VA, cards, and payouts

## Non-negotiable transaction rules

1. The mobile app never marks an order paid.
2. Payment status changes only from a verified server webhook.
3. Commissions are generated from paid real transactions, not registrations.
4. Every commission has pending, available, paid, or reversed status.
5. Refunds reverse related commissions.
6. Withdrawals require identity verification and an approved payout provider.
7. XAVI Points, AI Credits, and Commission Balance are separate ledgers.

## Production phases

1. Connect Supabase Auth and profiles.
2. Migrate demo catalog to database.
3. Add server-side order creation.
4. Integrate payment sandbox and verified webhook.
5. Add idempotent commission engine.
6. Add withdrawal approval and payout integration.
7. Add push notification, analytics, and audit log.
