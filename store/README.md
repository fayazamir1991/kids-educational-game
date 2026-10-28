# Publication package — Little Play Garden

This folder contains reviewable store material for the Persian, offline, eight-game Android application. The approved first release is free, has no advertising, accounts, purchases, social features or analytics, and is intended for ages 3–5.

`publisher.json` is public configuration, not a credential file. Publisher identity, support email, permanent package ID confirmation, public privacy-policy URL, account status and final review approvals are still pending. The JSON records those gaps explicitly. Do not fill them with invented information.

Run `node store/verify-publication-ready.mjs` to see the outstanding publication prerequisites. Its expected result is a nonzero exit until the owner supplies the missing information and final reviews are complete. Passing this record check is not store approval or a legal certification.

For this two-store delivery, account readiness is recorded for both Google Play and Cafe Bazaar. Record Google Play account type as `personal` or `organization`; for a personal account also record the creation-date category. `readiness` records actual final reviews and publisher authorization to upload; it is separate from authorization to build and test this project. The guard does not run as a debug-build prerequisite. Run its focused checks with `node --test store/verify-publication-ready.test.mjs`.

Contents:

- `listings/`: Persian and English listing text, with the in-game language accurately described as Persian.
- `branding/`: original SVG masters and generated PNGs for app/store branding.
- `screenshots/`: screenshot production plan and provenance manifest. Only actual native Android captures may be marked as final store screenshots.
- `data-safety-draft.json`: proposed answers that must be checked against the final APK/AAB and every bundled SDK.
- `content-rating-draft.md`: content inventory to help complete the live rating questionnaires; no fabricated IARC certificate or rating.
- `release-notes-fa.txt` and `release-notes-en.txt`: first-release notes.

The public privacy-policy documents are maintained in `public/privacy-fa.html` and `public/privacy-en.html`. The publisher must review the final content and make the policy publicly accessible over HTTPS before submission. A local file or repository-only draft does not satisfy the public-policy-URL requirement.

No app-store upload or public website publication is performed by these files. Signing credentials must stay outside Git; the publisher owns and backs up the signing material. See `docs/publishing-android.md` for the two-store signing strategy and submission sequence.
