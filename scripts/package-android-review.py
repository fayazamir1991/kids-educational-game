#!/usr/bin/env python3
"""Package verified test/unsigned Android artifacts; never includes signing keys."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
publisher = json.loads((root / 'store/publisher.json').read_text())
evidence = json.loads((root / 'docs/validation/android-build-1.0.0.json').read_text())
version = publisher['versionName']
if not re.fullmatch(r'\d+\.\d+\.\d+', version) or evidence['versionName'] != version:
    raise SystemExit('Review the version and actual binary evidence before packaging.')
output = root / 'release/android-v1'
output.mkdir(parents=True, exist_ok=True)
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

for item in evidence['artifacts'].values():
    file = root / item['path']
    if file.stat().st_size != item['bytes'] or digest(file) != item['sha256']:
        raise SystemExit(f'Binary differs from validation evidence: {item["path"]}')
if 'jar is unsigned' not in evidence['artifacts']['unsigned_release_aab']['signatureVerification']:
    raise SystemExit('This review package expects explicitly unsigned release outputs.')
if evidence['artifacts']['unsigned_release_apk']['signatureVerificationExitCode'] != 1:
    raise SystemExit('Do not label a signed release APK as unsigned.')

test_apk = output / f'kids-garden-test-{version}.apk'
shutil.copy2(root / evidence['artifacts']['debug_apk']['path'], test_apk)
archive = output / f'kids-garden-publication-{version}.zip'
with tempfile.TemporaryDirectory(prefix='kids-android-review-') as directory:
    stage = Path(directory)
    (stage / 'artifacts').mkdir()
    for key, extension in [('unsigned_release_apk', 'apk'), ('unsigned_release_aab', 'aab')]:
        shutil.copy2(root / evidence['artifacts'][key]['path'], stage / 'artifacts' / f'kids-garden-release-{version}-unsigned.{extension}')
    shutil.copytree(root / 'store', stage / 'store')
    (stage / 'docs').mkdir()
    for name in ['publishing-android.md', 'store-readiness.md', 'store-reviewer-notes.md',
                 'android-validation.md', 'asset-release-audit.md', 'audio-review.md', 'narration-offline.md']:
        shutil.copy2(root / 'docs' / name, stage / 'docs' / name)
    shutil.copytree(root / 'docs/validation', stage / 'docs/validation')
    (stage / 'privacy').mkdir()
    for language in ['fa', 'en']:
        shutil.copy2(root / f'public/privacy-{language}.html', stage / 'privacy')
    shutil.copytree(root / 'android/app/src/main/assets/native-licenses', stage / 'licenses/native')
    shutil.copytree(root / 'dist-store/licenses', stage / 'licenses/web')
    (stage / 'licenses/audio').mkdir(parents=True)
    for name in ['ATTRIBUTIONS.md', 'sources.json', 'ESC-50-LICENSE.txt', 'release-license-evidence.json']:
        shutil.copy2(root / 'dist-store/audio' / name, stage / 'licenses/audio' / name)
    note = 'این بسته شامل خروجی‌های انتشار بدون امضاست. APK آزمایشی جداگانه در پوشهٔ release/android-v1 مخزن عرضه می‌شود.\n\n'
    source = '\n\nSource: https://github.com/fayazamir1991/kids-educational-game/tree/codex/animal-sounds-landscape\n'
    (stage / 'README-fa.md').write_text(note + (output / 'README.md').read_text() + source)
    files = sorted(p for p in stage.rglob('*') if p.is_file())
    (stage / 'SHA256SUMS').write_text(''.join(f'{digest(p)}  {p.relative_to(stage).as_posix()}\n' for p in files))
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for file in sorted(p for p in stage.rglob('*') if p.is_file()):
            if file.suffix in {'.jks', '.keystore', '.pem', '.p12'}:
                raise SystemExit('Signing material must never enter the review package.')
            package.write(file, file.relative_to(stage).as_posix())
    with zipfile.ZipFile(archive) as package:
        if package.testzip() is not None:
            raise SystemExit('ZIP integrity check failed.')
(output / 'SHA256SUMS').write_text(''.join(f'{digest(p)}  {p.name}\n' for p in [test_apk, archive]))
print(json.dumps({'testApk': {'file': test_apk.name, 'bytes': test_apk.stat().st_size, 'sha256': digest(test_apk)},
                  'unsignedPublicationPackage': {'file': archive.name, 'bytes': archive.stat().st_size, 'sha256': digest(archive)}}, indent=2))
