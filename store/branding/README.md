# Little Play Garden branding

The smiling five-petal flower is original vector artwork created for this project. It uses the game's pastel palette and does not contain third-party logos, characters, stock art or claimed awards. `master/` contains editable SVG sources; `png/` contains their rendered exports. The project license applies to this original artwork.

| Export | Use | Dimensions |
| --- | --- | --- |
| `png/adaptive-foreground-432.png` | Android adaptive icon foreground; transparent | 432 × 432 |
| `png/adaptive-background-432.png` | Android adaptive icon background; opaque cream | 432 × 432 |
| `png/play-icon-512.png` | Google Play/store app icon; opaque, square, no baked corner mask | 512 × 512 |
| `png/feature-graphic-fa-1024x500.png` | Persian promotional feature graphic | 1024 × 500 |
| `png/feature-graphic-en-1024x500.png` | English promotional feature graphic, explicitly describing Persian games | 1024 × 500 |

The adaptive mark stays inside Android's central 66/108 safe circle, so launcher masks can crop the outer background. Android resource density generation and copying are owned by the native project. The store icon is intentionally larger than the adaptive foreground.

The feature graphics are promotional artwork, **not screenshots of the app**. Actual Android screenshots have a separate capture/provenance process in `../screenshots/`.

Rebuild from the original vector definitions with `node store/branding/render-assets.mjs`. It uses the existing Playwright package and system Chromium, renders without network requests, and embeds the bundled Vazirmatn Arabic font subsets in the feature SVGs for portable Persian shaping. Override `CHROMIUM_PATH` if Chromium is installed elsewhere. SVG masters containing embedded font subsets retain the font's SIL Open Font License: see `Vazirmatn-OFL.txt`. No new font licensing restriction is applied to the artwork.

Final publisher approval of branding remains part of listing review. There is no implication of a submitted or approved store listing.
