# Stage 3B Requirement — Personal Dashboard

This is an information architecture and backend dependency specification only. Stage 3A
does not implement the final dashboard, campaign CMS, service transactions, or fake data.

## Header

- local time-aware greeting;
- profile/avatar and server-derived membership badge;
- notification entry backed by a future notification service;
- Personal/Business Workspace switcher from access context;
- server-derived benefit summary;
- no fabricated balance, points, cashback, or reward.

## Hero campaign carousel

Render four or five active campaigns with manual swipe, accessible indicators and CTA.
Optional auto-rotation pauses after interaction, stops off-focus, and respects Reduce Motion.

Required contract:

```text
id, campaign_key, title, short_description, image_asset, cta_label,
target_route, active, priority, starts_at, ends_at,
minimum_membership, required_entitlement, audience_workspace_kind,
analytics_key, version
```

Routes/deep links are allowlisted. Backend contract evaluates schedule, active state,
audience, and entitlement. Basic upgrade content reads server access context. Never show
fake price, discount, cashback, countdown, urgency, scarcity, or unavailable benefits.

Possible themes—only when real—include membership education, Home Service, pulsa/bills,
daily commerce, and Business Workspace activation.

## Service icon grid

Home shows 8–12 prioritized services and **Semua Layanan** shows the full catalog: Pulsa,
Paket Data, Token PLN, Tagihan, Belanja, Cleaning, Massage, Kendaraan, Laundry, Service AC,
Handyman, Klinik, Farmasi, Family Hub, Travel, Pendidikan, Lifestyle, Semua Layanan.

Use consistent custom icons, readable labels, accessible touch targets, and no emoji.
Coming Soon and maintenance stay visibly disabled. Locks come from server entitlement.

## Service catalog contract

```text
service_key, title, short_description, category, icon_key,
active, maintenance, coming_soon, required_entitlement,
minimum_membership, supported_regions, display_order, featured,
target_route, starts_at, ends_at, analytics_key, version
```

Backend validates routes, membership, regions, time windows, and version. Stage 3A creates
no checkout, payment, booking, order, or service transaction.

## Dynamic sections and dependencies

| Section | Future source | Boundary |
| --- | --- | --- |
| Upcoming bills | biller/account schedule API | no fake bills |
| Active booking/order | Stage 4 order/booking | no transaction model in 3A |
| Recently used/repeat | completed activity projection | real activity required |
| Recommendations | consented ranking input | no production personalization yet |
| Membership benefit | access context | foundation available |
| Referral/reward | future ledger | no balance claims |
| Recent activity | privacy-scoped activity feed | audit table is not a user feed |
| XAVI AI | future quota/conversation contract | quota pending |
| Merchant/provider | marketplace availability | Stage 4+ |

Each section needs skeleton, meaningful empty state, error/retry, refresh, and freshness.
Refresh must obtain a new server context before unlocking gated content.

## Basic upsell

Basic keeps Personal Workspace and eligible core services. Upsell is limited to membership
badge, one relevant banner, explicit locked benefit, comparison page, and contextual CTA.
No repeated popup, fake urgency/scarcity, or blocking essential service to force upgrade.

## Visual and UX

Use Midnight Navy with restrained cyan/indigo/violet accents and approved Ecosystem X assets.
Maintain precise spacing, accessible contrast/touch targets, no white flash, lightweight
motion, Reduce Motion, optimized images, and mid-range Android performance. Avoid excessive
glow, continuous battery-heavy animation, and demo-style menu grids.

## Analytics contract

Reserved non-PII events:

- `dashboard_viewed`
- `workspace_switched`
- `banner_viewed`
- `banner_clicked`
- `service_icon_viewed`
- `service_selected`
- `locked_service_selected`
- `upgrade_cta_selected`
- `all_services_opened`

Allowed properties: opaque campaign/service key, workspace kind, membership identifier,
position, result state, contract version. Never send name, email, phone, user/workspace ID,
slug, free text, token, session, address, health, or payment data. No analytics provider is
installed in Stage 3A.

## Implementation gate

Before final UI: verify hosted Stage 3A migration, mount the access provider, provision
Personal Workspace after onboarding, approve campaign/service configuration ownership,
approve commercial membership values, implement real states, and verify every route/lock
against server access context.
