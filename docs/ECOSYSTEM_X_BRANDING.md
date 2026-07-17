# Ecosystem X branding

## Approved visual meaning

Ecosystem X is the primary XAVI-OS mark on Midnight Navy `#050B18`. Its four nodes are fixed:

- upper-left: Personal;
- upper-right: Business;
- lower-left violet node: XAVI AI;
- lower-right: Commerce;
- center X: Xavindo infrastructure connecting the ecosystem.

The master references are `assets/brand/reference/ecosystem-x-detail.png` and `assets/brand/reference/ecosystem-x-app-icon.png`. They must not be overwritten by generated output. The checked-in masters are losslessly re-encoded to remove provenance and sensitive ancillary metadata while preserving their decoded pixels exactly.

## Reproducible production assets

When a newly supplied master replaces either reference, run `npm run brand:sanitize-references` once. Then run `npm run brand:generate` to derive production PNG files and `npm run brand:check` to verify reference checksum, output checksum, dimensions, alpha behavior, metadata stripping, and adaptive-icon circular safe zone.

| Asset | Dimensions | Purpose |
| --- | ---: | --- |
| `icon/app-icon.png` | 1024×1024 | opaque legacy/Expo app icon |
| `icon/adaptive-foreground.png` | 1024×1024 | transparent Android adaptive foreground |
| `icon/adaptive-background.png` | 1024×1024 | opaque Midnight Navy reference background |
| `icon/adaptive-monochrome.png` | 1024×1024 | white alpha-mask Android themed icon |
| `splash/splash-logo.png` | 768×768 | transparent native splash logo |
| `splash/splash-static.png` | 1080×1920 | opaque static fallback preview |
| `animation/ecosystem-x-intro.png` | 768×768 | complete transparent intro mark/glow |
| `animation/ecosystem-x-core.png` | 768×768 | X infrastructure layer |
| four `animation/node-*.png` files | 256×256 each | ordered Personal, Business, AI, Commerce nodes |

The generator re-encodes PNG files with only structural PNG chunks. It uses the approved simplified app-icon reference, subtracts its Midnight backdrop for transparent layers, scales without stretching, keeps adaptive artwork inside a conservative circular safe radius, creates a clean monochrome alpha mask, and uses the exact `#050B18` backdrop for opaque outputs.

## Startup behavior

The native splash is static. Once React Native has laid out a Midnight Navy root view, `BrandIntroGate` hides the native splash and runs a 1600 ms in-app sequence while `AuthProvider` restores the session in parallel. Animation completion reveals the latest Auth route; it never derives or changes authentication state.

Normal motion fades/scales the X, reveals connection light, presents Personal → Business → XAVI AI → Commerce, pulses the AI node once, and finishes with a subtle complete-mark glow. Reduce Motion uses a 280 ms fade without connection movement or pulse. Safety fallbacks are 2300 ms and 700 ms respectively. Asset failure also releases the gate. A runtime-global completion flag prevents replay during Fast Refresh while naturally resetting with a new cold-launch JavaScript runtime.
