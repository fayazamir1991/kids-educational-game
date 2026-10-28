# Android 1.0.0 review build — validation record

Checked 2026-10-28. This records build and test evidence, separately from publication approval. No store upload was performed.

| Check | Result |
| --- | --- |
| Browser integration | 49/49 Playwright tests pass against a stable source snapshot; its `src` and `public` directories match the final source exactly. Covers all eight games, full sessions, wrong/correct reactions, settings, parental gate, navigation, pointer interaction and phone layouts. |
| Game logic | 4/4 Node tests pass, including 1,000 seeded sessions and exclusion of uncertain recordings. |
| Offline standalone regression | Pass: all eight games, 17 legacy review recordings decoded, 14 active quiz calls, no network requests. Exact HTML bytes tested with offline `page.setContent`; direct file navigation was not tested. This is a browser regression, not an Android runtime test. |
| Native unit tests | 9/9 pass: four URL/navigation policy cases and five lifecycle/audio-focus cases. |
| Native lint/build | 0 lint errors, 22 warnings in template/resource/version categories. Debug APK, unsigned release APK and unsigned AAB build successfully with JDK 21 and SDK 36. |
| Asset rights and bytes | Source/end-product guards pass; `dist-store` and native copied assets contain exactly 14 approved MP3s, matching credits, hashes and license notices. Chick, monkey and donkey recordings are absent from Android outputs. |
| Packaged binary inspection | All three archives match expected source hashes; no native `.so` libraries. Release is not debuggable. No Internet, advertising ID or dangerous Android permission; only the app-local signature receiver permission from AndroidX. |
| Signing | Debug APK verifies with its development certificate. Release APK/AAB are deliberately unsigned because no publisher-owned release key was supplied. |
| Android execution | APK installed successfully on API 36 in airplane mode with Wi-Fi disabled. The guest's WebView 133 crashes natively before a responsive game page. Official preinstalled WebViewShell reproduces the same crash with a local HTML page and Internet permission granted. This isolates an emulator/WebView failure independent of game code; native gameplay remains unverified. |
| Physical phone and listening | Not performed. A supported physical phone must verify first launch offline, all games, playback, orientation, Back, interruption recovery and animal recognizability. No personal listening claim is made. |
| Persian speech guidance | 0 enabled narration clips; an unclear synthetic trial was withheld. Picture instructions, animal recordings and musical feedback remain available. |

Exact artifact hashes and native results are in [validation/android-build-1.0.0.json](validation/android-build-1.0.0.json); the consolidated record is [validation/release-validation-1.0.0.json](validation/release-validation-1.0.0.json).

The emulator crash is a limit on runtime evidence, not permission to mark device acceptance complete. It also does not justify changing app permissions or weakening navigation protections. Blank guest framebuffers are not game screenshots. Browser screenshots are labeled previews and must not be passed off as native store captures.

Before release, complete publisher identity/contact, a reviewed public privacy-policy URL, permanent application ID, owner signing strategy, physical-device/audio acceptance, native screenshots and the live store forms/testing requirements. `npm run store:check` intentionally fails while those facts are pending.

For this Linux cloud workspace, `bash scripts/setup-android-toolchain.sh` prepares checksum-verified official JDK/SDK tools outside the repository; source `/workspace/android-toolchain/env.sh`, then run `bash scripts/android-build.sh all`. Other development machines may use Android Studio with JDK 21 and SDK 36. Never put a release key or signing passwords in Git.
