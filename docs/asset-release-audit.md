# Asset release audit — current audio revision 3

Checked 2026-10-28. The current fourteen Android animal recordings have documented commercial game and public-source distribution permissions. The lion and bee were replaced to remove two unresolved rights issues. This is an evidence inventory and an exact-file build check, not a legal opinion or human listening approval.

`public/audio/release-manifest.json` binds rights decisions to final MP3 SHA256 values. `src/audio-review.json` independently binds automated event screening to those same bytes. The release build must contain exactly fourteen animal MP3s; chick, monkey and donkey are excluded even though legacy web review still contains seventeen recordings.

## Current recordings

“Both” below means documented permission for a commercial compiled game and for distributing the recording alongside public project source, subject to retaining any attribution/change notices. A filename, a working download or a model score is not license evidence.

| Recording | Rights evidence | Distribution | Android |
| --- | --- | --- | --- |
| cow | Joseph SARDIN / BigSoundBank, explicit pinned CC0 assertion | Both | Included |
| sheep | zwier / Freesound 200329, explicit per-recording CC0 | Both | Included |
| crow | Q.K. / Freesound 56233, explicit per-recording CC0 | Both | Included |
| lion | Commons own-work recording by த*உழவன், explicit PD-self dedication | Both | Included |
| fly | galeku / Freesound 46938, explicit per-recording CC0 | Both | Included |
| bee | YleArkisto, Freesound 263673 / Commons, exact CC BY 3.0 | Both, attribution and changes retained | Included |
| rooster | Joseph SARDIN / BigSoundBank, explicit pinned CC0 assertion | Both | Included |
| hen | jsbarrett / Freesound 200330, explicit per-recording CC0 | Both | Included |
| horse | Joseph SARDIN / BigSoundBank, explicit pinned CC0 assertion | Both | Included |
| dog | Joseph SARDIN / BigSoundBank, explicit pinned CC0 assertion | Both | Included |
| cat | Joseph SARDIN / BigSoundBank, explicit pinned CC0 assertion | Both | Included |
| duck | Joseph SARDIN / BigSoundBank, explicit pinned CC0 assertion | Both | Included |
| pig | tompallant / Freesound 257858, explicit per-recording CC0 | Both | Included |
| frog | Joseph SARDIN / BigSoundBank, explicit pinned CC0 assertion | Both | Included |
| chick | Barbamiz / Freesound 116135, explicit per-recording CC0 | Both | Excluded: sound identity uncertain |
| monkey | Archeos original CC0; conservative AltSFX excerpt credit CC BY 3.0 | Both, notices retained | Excluded: sound identity uncertain |
| donkey | JarredGibb / Freesound 233131, pinned VoxeLibre media notice CC0 | Both | Excluded: sound identity uncertain |

The full creator, original URL, license link, pinned mirror, evidence quote, processing and hashes are in `public/audio/sources.json`. Android includes only the fourteen relevant entries in its own `audio/sources.json` and `audio/ATTRIBUTIONS.md`.

### Evidence quality and the ESC-50 collection

For the seven BigSoundBank recordings, the pinned [OVOS sound skill CREDITS](https://github.com/andlo/ovos-skill-sound-like/blob/77d00889839d6e13af953bf0ee70afb067852aa1/CREDITS.md) explicitly states:

> All bundled sounds in sounds/animals/ are from bigsoundbank.com, released under a CC0 (public domain equivalent) license by Joseph SARDIN.

It identifies individual original pages. Direct BigSoundBank pages returned HTTP 403 during this audit, so this is a pinned upstream assertion rather than a claim that the original pages were independently read.

For the five included Freesound recordings obtained through ESC-50, the pinned [ESC-50 LICENSE](https://github.com/karolpiczak/ESC-50/blob/33c8ce9eb2cf0b1c2f8bcf322eb349b6be34dbb6/LICENSE) separately identifies each original sound, creator and **CC0** license. The ESC-50 dataset compilation itself is **CC BY-NC 3.0**. This project relies on the individual recording permissions; it does not claim a commercial license for the whole dataset. The full collection/per-recording notice is preserved in `audio/ESC-50-LICENSE.txt`, including in the Android output. Direct Freesound access also returned 403. A CC-BY version is never inferred from an unversioned label.

## Lion replacement

The current recording is [Lion raring-sound1TamilNadu178.ogg](https://commons.wikimedia.org/wiki/File:Lion_raring-sound1TamilNadu178.ogg), uploaded as the author's **own work** by Commons user தகவலுழவன் / த*உழவன், dated 2010-09-04. The [exact description revision 1050777795](https://commons.wikimedia.org/w/index.php?title=File%3ALion_raring-sound1TamilNadu178.ogg&oldid=1050777795) declares `{{PD-self}}` and describes a male lion roaring in captivity. This is an explicit public-domain dedication, not a claim that the uploader selected CC0.

- Original Ogg SHA256: `ab237d0f960e83412251d0c11f69959f3c2e8d3b14595f7181c3056f7fa18bf7`.
- Selected natural-recording window: 4.85s–7.00s; no animal synthesis, pitch shifting or repeated roar.
- Final MP3 SHA256: `da745ea62c22e5c1b6197357794289fbfc73816432dce507ae2480dace58fee0`.
- Exact final MP3 YAMNet support: Roar mean 0.879883 / max 0.996094; Roaring cats mean 0.908203. No competing background flag was raised by the configured screening thresholds. This does not prove that no background noise exists.

The precise own-work/license wikitext is retained in `public/audio/release-license-evidence.json` so the rights declaration is reviewable independently of an audio model.

## Bee replacement

The current recording comes from **YleArkisto / Finnish Broadcasting Company Yle Archives**, [Freesound 263673](https://www.freesound.org/people/YleArkisto/sounds/263673/) and its [Commons archival copy](https://commons.wikimedia.org/wiki/File:263673_ylearkisto_mehilainen-tarhamehilainen-parvi-bees-honeybees-a-swarm-of-bees-buzzing-among-the-flowers-apis-mellifera.wav). It documents honeybees (*Apis mellifera*) flying and collecting nectar among flowers, recorded on a Nagra analog tape recorder at Joensuu/Kaltimo, Finland, on 1975-08-02. The [exact description revision 1187049516](https://commons.wikimedia.org/w/index.php?title=File%3A263673_ylearkisto_mehilainen-tarhamehilainen-parvi-bees-honeybees-a-swarm-of-bees-buzzing-among-the-flowers-apis-mellifera.wav&oldid=1187049516) explicitly declares **CC BY 3.0**. The author, original source and exact license version were read from the Commons description; the original Freesound page was inaccessible here.

- Original WAV SHA256: `1418432c64293a50c70f7c45a3c4ab9f5a84fefd89e5e21b076e100fa9dbc94a`.
- Selected window: 7.95s–11.80s. Changes: trimming, 60Hz high-pass filter, loudness normalization, fades, silence padding, mono conversion and MP3 encoding. No synthesis, pitch shifting or repetition.
- Final MP3 SHA256: `dda8d0c3d2c76057179bc1967e2b414575dcaacd7cfa44dadfa78f0727dcab4a`.
- Exact final MP3 YAMNet support: Bee mean 0.977051 / max 0.996094; Insect mean 0.985840. The fly score also overlaps (0.824707), so bee and fly remain prohibited from appearing together as answer choices. The model cannot establish an audible bee/fly distinction.
- CC BY 3.0 attribution, source, license link and changes are included in metadata and the packaged attribution. No endorsement by Yle is implied.

The previous Freesound 73585 recording was explicitly listed as “CC-BY” by ESC-50, but an exact license version could not be verified. Primary endpoints returned 403 and the official FSD50K metadata did not contain that exact sound ID. Its license version was not guessed; the recording is replaced in current source and builds.

## Historical Mixkit source issue

The old lion is now identified exactly as official Mixkit item **6, “Wild lion animal roar”**. The official MP3 preview and the pinned historical Roary Pet mirror were downloaded and match byte-for-byte: 33,601 bytes, SHA256 `1647bd5ce1b0799ac94f79820a9a36b92867723cf55a0e74e1638c6ac11fddfe`. The [official item download modal](https://mixkit.co/free-sound-effects/download/6/?context=item+grid) supplies the WAV. This resolves the earlier unknown catalog identity.

The [complete Mixkit SFX terms](https://mixkit.co/license/modal/sfxFree/) allow commercial games as a larger End Product but state:

> You can’t redistribute the Item on its own, as stock, in a tool or template, or with source files.

Therefore the historical item had different conclusions for **compiled game use (documented permitted)** and **raw/public source distribution (restricted)**. The current lion is replaced so neither current build nor source snapshot depends on this restriction. Previous public history/source archives may still contain the old recording. The repository owner must assess existing public copies and any appropriate remediation. No history was rewritten and no new Mixkit raw audio was committed. `public/audio/Mixkit-mirror-NOTICE.md` retains the investigation.

## Other assets and remaining review

- Vazirmatn is distributed with its SIL Open Font License 1.1 notice in `licenses/Vazirmatn-OFL.txt`. Its font license is independent of application and audio licenses.
- Current project SVG illustrations, CSS game graphics and newly created branding are project assets. This audit has not independently established their authorship from third-party documentation. The owner should review the supplied artwork/branding and confirm ownership before signing a release; no rights to the inspiration websites' artwork or trademarks are asserted.
- Any new narration recordings need their own source/voice provenance and listening approval. The animal allowlist verifier does not certify narration, an Android signing identity, publisher ownership or store policy compliance.
- No audio was heard by a human in this environment. A responsible adult must listen to the **final packaged recordings** on a physical phone and approve recognizable species, comfortable volume, clean starts/ends and toddler suitability before store publication. The three withheld recordings remain excluded. Model scores alone cannot close this check.

## Reproducible checks

```sh
node scripts/verify-recordings.mjs
node scripts/verify-release-assets.mjs --target source
node scripts/verify-release-assets.mjs --target end-product --artifact-dir dist-store
```

The verifier checks hash-bound rights, unchanged source evidence, all fourteen enabled IDs, the three excluded IDs, exact bundled MP3 bytes, packaged attribution/metadata, the ESC-50 notice and font license. It fails on changed/missing/extra audio and stale metadata. `--allow-pending` is a diagnostic override for unresolved rights only; it prints an explicit warning and never bypasses structural/hash checks. A successful result concerns documented asset permissions and bytes; it does not claim the whole application is ready for store submission.

To reproduce semantic screening, use `scripts/audit-animal-recordings.py` on the final lion and bee MP3s with the pinned YAMNet model. Full output for these replacements, including window-level event scores and limitations, is in `docs/audio-release-replacement-evidence.json`.
