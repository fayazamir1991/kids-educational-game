# Offline Persian narrator

The runtime player is ready. **No narrator clip is enabled for release yet.**
The 37 current game prompts are enumerated in `public/narration/prompts.json`.
The natural animal recordings have their own sources and review process; a
synthetic narrator must never replace an animal call.

The local trial synthesized `کی خوابیده؟` into a decodable 3.28-second recording.
Local Whisper-base transcribed it as `چی خویده`, which differs from the target.
ASR can make mistakes, so this is a reason to require listening, not proof that
the voice pronounces a particular word incorrectly. The trial is kept outside
the shipped assets. Exact hashes, model provenance, automatic results, and the
explicit pending listening status are in `docs/narration-investigation.json`.
The current build therefore uses the safe empty catalog (0 of 37 prompts).

`src/narration.js` exports:

- `playNarration(text, volume) → Promise<boolean>`: starts a reviewed, bundled
  recording. Returns false when unavailable. A cancelled pending request returns
  true so an earlier screen cannot trigger a delayed speech fallback.
- `stopNarration()`: stops the active recording and cancels pending playback.
- `hasNarration(text)` and `narrationClipCount`: report the installed catalog.

The module makes local asset requests only. It has no microphone, telemetry,
speech synthesis service, or remote fallback. Text is matched to a fixed catalog;
unknown sentences are not guessed. Both normal assets and the standalone
download's `__LITTLE_FARM_ASSETS__` data URLs are supported.

The Android caller should leave the visual instructions available when a clip
is missing. Device Web Speech is unsuitable as a guaranteed offline Persian
voice: availability, language, and network use depend on the installed engine.

## Candidate source investigated

The candidate narrator is **synthetic**, generated without a reference speaker
using MOSS-TTS-Nano-Persian's plain `continuation` mode. It does not clone a chosen
person. Models are build tools, not included in the APK or AAB.

| Component | Pinned revision | Published license |
| --- | --- | --- |
| [Nima Saghi's Persian fine-tune](https://huggingface.co/nimaaaAI/MOSS-TTS-Nano-Persian/tree/dcfd7f2baab4bb69434895f51eae6a0c0059c59f) | `dcfd7f2baab4bb69434895f51eae6a0c0059c59f` | Apache-2.0; an actual LICENSE file and attribution are present |
| [OpenMOSS base model](https://huggingface.co/OpenMOSS-Team/MOSS-TTS-Nano/tree/44502f80dbf9743528fa921cc544d662c685ebec) | `44502f80dbf9743528fa921cc544d662c685ebec` | Apache-2.0, including the [upstream repository license](https://github.com/OpenMOSS/MOSS-TTS-Nano/blob/main/LICENSE) |
| [OpenMOSS audio tokenizer](https://huggingface.co/OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano/tree/6aa02b01e445cc585582cf0ba480bc3ea6c8dd68) | `6aa02b01e445cc585582cf0ba480bc3ea6c8dd68` | Apache-2.0 as declared in its model card |

The fine-tune author documents 34,000 Mozilla Common Voice Persian v13 clips
under CC0. The author also warns that generated speech can be flat, short
utterances work best, reference quality matters, and real people should not be
impersonated. A published model license does not establish that every generated
sentence sounds correct or suitable for a child.

Persian Piper models Amir, Ganji, and Reza were considered but not used. Their
cards refer to CC0 Persian datasets and Lessac-derived initialization. The
[original Lessac dataset agreement](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html)
restricts its use to research and expressly excludes commercial voice-synthesis
development. A top-level MIT label does not resolve this provenance conflict;
commercial permission would need clarification before using those candidates.

## Reproduce a candidate

Use Python 3.12 with CPU-only `torch==2.7.0+cpu`, `torchaudio==2.7.0+cpu`,
`transformers==4.57.1`, `sentencepiece`, `numpy`, `soundfile`, and FFmpeg. Keep
these build dependencies outside the application repository. Download model
files from the pinned revisions above, inspect their custom Python code before
using `trust_remote_code`, and retain the source license notices.
`public/narration/model-sources.json` records the downloaded files' SHA-256
checksums and pinned license URLs; generation refuses changed or missing model
files instead of labelling them as the audited source.

```sh
python3 scripts/build-narration-candidates.py \
  --model /path/to/local/persian-model \
  --codec /path/to/local/audio-codec \
  --output-dir /path/outside/public/narration-candidates \
  --only picture-sleeping
```

Omit `--only` for all 37 prompts. Once local model files are downloaded,
generation is offline. The script sets Hugging Face offline mode and disables
its telemetry, uses no reference audio, records source/model hashes, applies
consistent volume and a true-peak target, and checks that the encoded MP3 can be
decoded. It writes a local `review.html` so a Persian-speaking adult can listen
to each clip beside the exact intended text. Candidates cannot be generated
directly into `public` by this script.

## Accept recordings

A Persian-speaking reviewer must check every complete recording for its exact
words, pronunciation, clarity, child suitability, and comfortable volume on an
actual phone. Automated waveform checks or ASR are useful checks but cannot
replace this listening review. No human listening has been claimed here.

After review, copy accepted MP3s and their manifest entries into
`public/narration`, keep each SHA-256 and provenance intact, include the source
Apache license/attribution, and record `review.status: "approved"`, the reviewer,
the review date, `redistributionApproved: true`, and `enabled: true` for each.
These fields describe real completed review; they must not be filled just to
make a release check pass. Licensed human recordings of the same prompts can
use the same catalog/player when synthetic speech is unsuitable.

```sh
node scripts/build-narration-catalog.mjs
node scripts/build-narration-catalog.mjs --check
node scripts/build-narration-catalog.mjs --check --require-complete
```

The last command fails unless all 37 prompts have reviewed, licensed recordings.
The catalog is embedded in the JS bundle. Extend the standalone asset builder
to embed the accepted `/narration/*.mp3` files before shipping the single-file
download. Changing a game prompt requires a matching catalog entry and a new
recording, so spelling changes cannot silently play an unrelated sentence.
