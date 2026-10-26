# Recorded animal sounds — audio revision 2

Original source/license attributions for all17 reviewable recordings. 14 are active in the child quiz; chick, monkey and donkey are deliberately withheld pending stronger identity/recognizability evidence. Full metadata and exact output SHA256 are in sources.json.

The current files were machine-screened with the official Google YAMNet model. This is NOT human listening or certification; see docs/audio-review.md in the repository. Hash-bound evidence is src/audio-review.json.

| Animal | Original recording | Creator | License | Quiz |
| --- | --- | --- | --- | --- |
| گاو (cow) | [Cow moos](https://bigsoundbank.com/cow-moos-s0546.html) | Joseph SARDIN | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |
| گوسفند (sheep) | [Sheep_in_field.aiff](https://www.freesound.org/people/zwier/sounds/200329/) | zwier | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |
| جوجه (chick) | [Rooster and chicks.mp3](https://freesound.org/people/Barbamiz/sounds/116135/) | Barbamiz | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | withheld |
| کلاغ (crow) | [Crows_01.wav](https://www.freesound.org/people/Q.K./sounds/56233/) | Q.K. | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |
| میمون (monkey) | [Monkey screaming](https://freesound.org/people/Archeos/sounds/325549/) | Archeos; excerpt distributed by ALEX11BR / AltSFX | [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) | withheld |
| شیر (lion) | [Lion roar (Mixkit; original item ID not supplied by mirror)](https://mixkit.co/free-sound-effects/lion/) | Mixkit (via credited Roary Pet audio asset) | [Mixkit Free Sound Effects License](https://mixkit.co/license/#sfxFree) | active |
| مگس (fly) | [flys-I.wav](https://freesound.org/people/galeku/sounds/46938/) | galeku | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |
| زنبور (bee) | [Bees in treetop.wav](https://www.freesound.org/people/J.Zazvurek/sounds/73585/) | J.Zazvurek | [CC-BY](https://creativecommons.org/licenses/) | active |
| خروس (rooster) | [Rooster song](https://bigsoundbank.com/detail-0283-rooster-song.html) | Joseph SARDIN | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |
| مرغ (hen) | [chicken_chatter.aif](https://freesound.org/people/jsbarrett/sounds/200330/) | jsbarrett | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |
| اسب (horse) | [Horse neighing 3](https://bigsoundbank.com/horse-neighing-3-s0863.html) | Joseph SARDIN | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |
| الاغ (donkey) | [Donkey call (VoxeLibre mobs_mc_donkey_random.2.ogg excerpt)](https://freesound.org/people/JarredGibb/sounds/233131/) | JarredGibb | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | withheld |
| سگ (dog) | [2 dogs barking](https://bigsoundbank.com/2-dogs-barking-s0868.html) | Joseph SARDIN | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |
| گربه (cat) | [Meow cat 1](https://bigsoundbank.com/detail-1889-meow-cat-1.html) | Joseph SARDIN | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |
| اردک (duck) | [Ducks](https://bigsoundbank.com/detail-0276-ducks.html) | Joseph SARDIN | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |
| خوک (pig) | [Pig_Grunts_Snorts_Breathing_Hackney_City_Farm.wav](https://www.freesound.org/people/tompallant/sounds/257858/) | tompallant | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |
| قورباغه (frog) | [Frogs 1](https://bigsoundbank.com/frogs-1-s0997.html) | Joseph SARDIN | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | active |

## Processing and notices

Short target-event sections were selected, normalized around -20 LUFS/-3dBTP, and gently faded. Full processing details are per-recording in sources.json. No animal voice synthesis or pitch shifting was used. The withheld monkey/donkey excerpts repeat genuine short recordings, but are not used as quiz answers or distractors.

- **cow**: Original BigSoundBank recording; bundled CC0 mirror identifies the creator and exact source page.
- **sheep**: Original per-recording license is retained. The ESC-50 dataset compilation has a separate CC BY-NC license; preserve its notice. No CC-BY version is inferred where upstream gives only the license family.
- **chick**: Original Freesound field recording is explicitly marked CC0 in the dataset per-clip licensing details; the ESC-50 collection as a whole has a separate CC-BY-NC-3.0 license.
- **crow**: Original per-recording license is retained. The ESC-50 dataset compilation has a separate CC BY-NC license; preserve its notice. No CC-BY version is inferred where upstream gives only the license family.
- **monkey**: Original recording is CC0; conservative attribution also preserves the AltSFX sound-set-wide CC-BY 3.0 credit.
- **lion**: The same pinned themes/roary/README.md documents relocation to assets/sounds/roary-roar.mp3. Direct Mixkit access is blocked in this environment; sourced from this explicitly attributed GitHub mirror, not downloaded from Mixkit directly. The mirror does not identify the original Mixkit catalog ID. Third-party audio has a separate license from the surrounding AGPL code/artwork, neither of which is used here.
- **fly**: Original recording is CC0 per per-recording license evidence; ESC-50 compilation metadata has a separate CC-BY-NC license.
- **bee**: Original per-recording license is retained. The ESC-50 dataset compilation has a separate CC BY-NC license; preserve its notice. No CC-BY version is inferred where upstream gives only the license family.
- **rooster**: Original BigSoundBank recording; bundled CC0 mirror identifies the creator and exact source page.
- **hen**: Original Freesound field recording is explicitly marked CC0 in the dataset per-clip licensing details; the ESC-50 collection as a whole has a separate CC-BY-NC-3.0 license.
- **dog**: Original BigSoundBank recording; bundled CC0 mirror identifies the creator and exact source page.
- **cat**: Original BigSoundBank recording; bundled CC0 mirror identifies the creator and exact source page.
- **duck**: Original BigSoundBank recording; bundled CC0 mirror identifies the creator and exact source page.
- **pig**: Original per-recording license is retained. The ESC-50 dataset compilation has a separate CC BY-NC license; preserve its notice. No CC-BY version is inferred where upstream gives only the license family.
- **frog**: Original BigSoundBank recording; bundled CC0 mirror identifies the creator and exact source page.

ESC-50 by Karol J. Piczak has a separate CC BY-NC compilation license. Preserve its full upstream ESC-50-LICENSE.txt and per-recording notices. The Mixkit roar comes from an explicitly attributed pinned GitHub mirror; direct Mixkit access was blocked, and the original catalog item ID is not known. The mirror specifically identifies the independent third-party audio under the Mixkit Free Sound Effects License; no surrounding AGPL program code or proprietary art was used. See Mixkit-mirror-NOTICE.md. Audio licenses are separate from application code and font licenses.
