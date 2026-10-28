# Store screenshot capture plan

Final store screenshots must be captured from the installed Android application on an emulator or physical device after the production web bundle has been synced. Browser previews and promotional drawings must not be relabeled as actual Android captures.

`browser-previews/` contains five **desktop Chromium review previews** of the production `dist-store` build, captured at 960×540. Each image is visibly labeled as a browser preview and its provenance records `nativeAndroidCapture: false` and `finalStoreScreenshot: false`. These let the publisher review the product while native capture is blocked; do not upload them as the final Android screenshot set. Reproduce with a Vite preview server serving `dist-store` on port 4173 and `node store/screenshots/capture-browser-previews.mjs`.

Current native limitation: the guest Android WebView crashes during startup, including in a separate official WebViewShell reproduction using a local data URL. This prevented native gameplay captures. A successful browser preview does not resolve that limitation or prove physical-device compatibility.

Recommended phone set (Persian UI):

1. Portrait collection menu showing the eight-game count and the first cards.
2. Picture Detective with a clear action cue and three different actors.
3. Lunch for Three Friends with one filled plate and two empty plates.
4. Shape House with a rotated piece and neutral-colored matching holes.
5. Color Baskets or Feed the Rabbit showing a clear visual goal.
6. A short celebration captured during an actual correct answer.

Optional tablet set: menu, picture scene, lunch and puzzle at the tested native tablet viewport. Do not stretch phone captures to create tablet screenshots.

Use clean native captures: no debug overlays, desktop browser frame, personal notifications, status messages or access credentials. Store dimensions must be checked against the current upload panels. The Google Play feature graphic is a separate 1024×500 promotional asset; it is not a gameplay screenshot.

Record the device/emulator model, Android API, app version, artifact SHA256, capture timestamp and filename in `provenance.json`. Keep `finalStoreScreenshot` false until the corresponding native capture is actually made and reviewed. Do not imply physical-device QA when only an emulator was used.
