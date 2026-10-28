# App-access notes for review — draft

Product: Little Play Garden / باغ بازی‌های کوچولو

Language: all gameplay is Persian (Farsi). The English store listing describes the Persian product; it does not promise an English gameplay mode.

Runtime requirement: Android 8.0/API 26 or newer, with Android System WebView 105 or newer. An older WebView should receive the bundled Persian update-help page. Updating the device's WebView may need internet; gameplay itself is bundled and offline.

No account, login credentials, subscription or purchase is required to access the eight games. Games and gameplay assets are bundled locally and can be tested offline. The parent area contains settings, privacy information and source/license material.

To enter parent settings, choose **والدین** (Parents), the lock button on the collection menu. The dialog titled **این بخش برای بزرگ‌ترهاست** asks the adult to tap three digits in the order specified by three Persian number words. Read the displayed words, then tap their matching digits in that order. The words and keypad order change for each challenge; there is no permanent PIN or test account. A successful challenge opens **همراه کوچولوی شما** (parent area), with **صدا و تنظیمات**, **منابع و مجوزها** and **حریم خصوصی** actions. Returning from the parent area to child play or backgrounding the app locks parent access. While parent screens remain open, the temporary session also expires after five minutes. This is an interaction gate, not identity verification or a child-data consent process. Recheck the final build's labels before submission.

Suggested reviewer path:

1. Open the collection, choose Picture Detective and complete one question using its visual cue.
2. Return to the collection, choose Lunch for Three Friends and give one fruit to each empty plate.
3. Open Shape House and match a rotated neutral-colored piece.
4. Open the animal-sound game, tap its listen control and try a response.
5. Open parent settings through the adult gate, inspect the privacy and source information, and test the external-link boundary.
6. Background and resume the app; verify sound and pending feedback stop appropriately.

Parent-initiated external links open separately in the system browser and may require internet. No child profile, score, recording or identifier should be added to these URLs. Verify this statement against the final bridge implementation before copying these notes into Play Console or Bazaar.
