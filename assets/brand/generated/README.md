# Ecosystem X asset pipeline

The two PNG files in `../reference/` are immutable visual masters supplied and approved by the project owner. Production assets are generated from `ecosystem-x-app-icon.png` with:

```bash
npm run brand:sanitize-references
npm run brand:generate
npm run brand:check
```

Sanitization is a lossless pixel re-encode that removes provenance/ancillary chunks. It does not modify the reference artwork. Run it only when newly supplied master files replace the current sanitized references.

The generator performs deterministic resizing, removes the approved Midnight Navy backdrop for transparent layers, keeps the complete mark inside the Android adaptive-icon safe area, produces a solid `#050B18` background, creates a white alpha-mask monochrome icon, and separates the four approved node regions for the in-app intro. PNG output is re-encoded without reference metadata. It does not redraw, prompt-generate, stretch, or reinterpret the Ecosystem X mark.

`asset-manifest.json` records reference and output checksums, dimensions, alpha expectations, generator version, and the approved background color. Do not edit production PNG files directly; update the approved master or generator and regenerate all outputs together.
