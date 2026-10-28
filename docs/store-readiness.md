# Store readiness record

This document tracks the difference between a working build, a reviewable publication package and an approved public listing. It must be updated from actual evidence, not assumed from successful compilation.

| Requirement | Current record | Evidence or next action |
| --- | --- | --- |
| Product scope | Approved: eight Persian games, approximately ages 3–5, offline, free, no ads/accounts/purchases | Check final packaged content and dependencies. |
| Publisher identity and contact | Pending | Owner supplies public publisher name and support email. |
| Permanent application ID | Proposed: `com.fayazamir.kidsgarden`; not yet owner-confirmed | Confirm before first store registration. |
| Version | First native review build: 1.0.0, code 1 | Built APK/AAB evidence: `docs/validation/android-build-1.0.0.json`; final publisher signing remains pending. |
| Android target | API 36 required for new standard apps under current Play rules | Verify actual merged manifest/build configuration. |
| Minimum device runtime | Android 8.0 / API 26 and Android System WebView 105+ | Check the final manifest and the local Persian upgrade screen on an older engine; do not equate Android version with WebView version. |
| Build and automated checks | Debug APK, unsigned release APK and unsigned AAB built; 49 browser checks, 9 native unit tests and 4 game-logic tests passed | Use `docs/validation/android-build-1.0.0.json` and `docs/validation/release-validation-1.0.0.json` for exact versions, artifacts and checks. Compilation and JVM tests do not prove Android gameplay. |
| Android gameplay/device QA | Blocked in the cloud emulator; physical-device testing pending | The guest WebView crashed before usable game UI. An independent official WebViewShell with a local data URL reproduced the native crash, including with INTERNET permission. No native gameplay success or compatibility sign-off is asserted. Re-test on a working supported Android runtime and physical devices. |
| Privacy policy | Draft files prepared separately by parent-area implementation | Fill real owner details, verify actual data flows, host on public HTTPS and test links. |
| Data safety | Draft worksheet only | Final binary, SDK, permission and network review required. |
| Content rating | Content inventory only | Publisher completes live questionnaires; no rating has been issued by this document. |
| Third-party assets | Release audit and production asset guards prepared; 14 allowlisted animal calls in the store build | Use `docs/asset-release-audit.md` and final bundle guards. Source/license checks do not replace human listening to every shipped animal call. |
| Branding | Original SVG masters and generated PNG package | Review rendered assets and copy approved adaptive assets into native resources. |
| Store screenshots | Native captures blocked; five labeled browser review previews available | `store/screenshots/browser-previews/` shows catalog, animal sounds, picture, lunch and shapes at 960×540 from `dist-store`. These are desktop browser captures, not native Android or final store screenshots; provenance records that distinction. |
| Signing ownership | Pending | App-signing certificate strategy across Play and Bazaar must be confirmed; private material stays outside Git. |
| Developer account/test track | Pending | Account type and creation date determine the applicable Play testing requirement. |
| Store upload/publication | Not performed | Requires completed prerequisites, actual account access and publisher review of the concrete submission. |

`store/verify-publication-ready.mjs` checks the matching public record in `store/publisher.json`. It intentionally reports pending prerequisites until those facts have been confirmed. Do not mark a prerequisite complete just to make the check pass.

The browser review previews were visually checked for the intended scene and legible preview label. They document appearance only. Final release acceptance still requires a working native gameplay run, real-device checks, final signing and the pending publication details above.
