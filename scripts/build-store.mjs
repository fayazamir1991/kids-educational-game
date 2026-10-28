import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async (name) => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status || 1);
};

// The Android product has a separate output so legacy web review material is
// never accidentally bundled as playable or parent-auditionable recordings.
run(process.execPath, ['scripts/verify-recordings.mjs']);
run(process.execPath, ['scripts/verify-release-assets.mjs', '--target', 'end-product']);
const review = await readJSON('src/audio-review.json');
const all = await readJSON('src/recordings.json');
const recordings = all.filter(({ id }) => review.animals[id]?.enabled === true);
if (recordings.length !== 14) throw new Error('Review the store allowlist before changing its fourteen animal calls.');
run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', 'dist-store', '--target', 'chrome105'], { ...process.env, VITE_STORE_BUILD: '1' });

const output = path.join(root, 'dist-store');
const audioDir = path.join(output, 'audio');
const allowedFiles = new Set(recordings.map(({ file }) => path.basename(file)));
allowedFiles.add('ESC-50-LICENSE.txt');
allowedFiles.add('release-license-evidence.json');
for (const filename of await readdir(audioDir)) {
  if (!allowedFiles.has(filename)) await rm(path.join(audioDir, filename), { recursive: true, force: true });
}
await writeFile(path.join(audioDir, 'sources.json'), JSON.stringify(recordings, null, 2) + '\n');
const attribution = recordings.map((item) => `## ${item.id}\n\n${item.source_title} — ${item.creator}\n\nSource: ${item.source_url}\nLicense: ${item.license} (${item.license_url})\nEvidence: ${item.license_evidence_url}\nProcessing: ${item.processing}\nFinal SHA256: ${item.sha256}\n`).join('\n');
await writeFile(path.join(audioDir, 'ATTRIBUTIONS.md'), '# Animal recordings included in the Android product\n\n' + attribution);
await mkdir(path.join(output, 'licenses'), { recursive: true });
await writeFile(path.join(output, 'licenses', 'app-assets.txt'), 'Game code and original vector illustrations: project contributors.\nPersian Vazirmatn font: SIL Open Font License 1.1; see licenses/Vazirmatn-OFL.txt.\nAnimal recordings: see audio/ATTRIBUTIONS.md and audio/sources.json.\n');
for (const dependency of ['core', 'app', 'android']) {
  const license = await readFile(path.join(root, 'node_modules', '@capacitor', dependency, 'LICENSE'), 'utf8');
  await writeFile(path.join(output, 'licenses', `Capacitor-${dependency}-LICENSE.txt`), license);
}
const manifest = { version: 1, profile: 'android-store', animalRecordings: recordings.map(({ id, sha256 }) => ({ id, sha256 })), excluded: all.filter(({ id }) => !review.animals[id]?.enabled).map(({ id }) => id) };
await writeFile(path.join(output, 'store-build.json'), JSON.stringify(manifest, null, 2) + '\n');
run(process.execPath, ['scripts/verify-release-assets.mjs', '--target', 'end-product', '--artifact-dir', 'dist-store']);
console.log(`Android web bundle: ${recordings.length} local animal calls; excluded ${manifest.excluded.join(', ')}.`);
