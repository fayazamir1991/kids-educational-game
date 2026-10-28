import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This verifies documented rights and exact bytes, not legal advice or listening.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let target = 'end-product';
let artifactDir;
let allowPending = false;
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--target') target = args[++index];
  else if (args[index] === '--artifact-dir') artifactDir = args[++index];
  else if (args[index] === '--allow-pending') allowPending = true;
  else throw new Error(`Unknown argument: ${args[index]}`);
}
if (!['source', 'end-product'].includes(target)) throw new Error('Use --target source or --target end-product.');
if (artifactDir === '' || (args.includes('--artifact-dir') && !artifactDir)) throw new Error('--artifact-dir requires a directory.');
const readJSON = async (file) => JSON.parse(await readFile(file, 'utf8'));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const manifest = await readJSON(path.join(root, 'public/audio/release-manifest.json'));
const sources = await readJSON(path.join(root, 'public/audio/sources.json'));
const review = await readJSON(path.join(root, 'src/audio-review.json'));
assert(review.model?.sha256 === '10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de', 'The screening model changed; review provenance before releasing.');
const excluded = ['chick', 'donkey', 'monkey'];
const expected = ['bee', 'cat', 'cow', 'crow', 'dog', 'duck', 'fly', 'frog', 'hen', 'horse', 'lion', 'pig', 'rooster', 'sheep'];
const sameIds = (left, right) => JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
assert(manifest.schemaVersion === 1, 'Unknown release asset manifest schema.');
assert(sameIds(manifest.excludedFromStore, excluded), 'The three withheld recordings must stay excluded.');
assert(sameIds(manifest.recordings.filter((entry) => entry.includeInStore).map(({ id }) => id), expected), 'Store allowlist changed: review all fourteen animal recordings.');
assert(sameIds(sources.map(({ id }) => id), manifest.recordings.map(({ id }) => id)), 'Release rights manifest must cover every source recording exactly once.');
assert(new Set(manifest.recordings.map(({ id }) => id)).size === manifest.recordings.length, 'Duplicate release rights entry.');
assert(sameIds(Object.entries(review.animals).filter(([, entry]) => entry.enabled).map(([id]) => id), expected), 'Enabled quiz recordings disagree with the release allowlist.');
const pending = [];
for (const entry of manifest.recordings) {
  const source = sources.find(({ id }) => id === entry.id);
  assert(source.file === `/audio/${entry.id}.mp3`, `Unexpected recording path: ${entry.id}`);
  const bytes = await readFile(path.join(root, 'public', source.file));
  assert(digest(bytes) === entry.sha256 && source.sha256 === entry.sha256, `Stale release rights/source hash: ${entry.id}`);
  assert(review.animals[entry.id]?.sha256 === entry.sha256, `Stale exact-file screening: ${entry.id}`);
  assert(source.license === entry.license && source.license_evidence_url === entry.evidenceUrl, `Release license evidence changed: ${entry.id}`);
  const relevant = target === 'source' || entry.includeInStore;
  if (relevant && entry[target === 'source' ? 'sourceDistribution' : 'commercialEndProduct'] !== 'documented-allowed') {
    pending.push(`${entry.id}: ${entry.reason || 'rights not documented for this distribution target'}`);
  }
  if (entry.includeInStore) {
    assert(review.animals[entry.id].status === 'machine-screened', `Store recording lacks hash-bound event screening: ${entry.id}`);
  }
}

if (artifactDir) {
  const output = path.resolve(root, artifactDir);
  assert((await stat(output)).isDirectory(), 'Artifact directory is missing.');
  const audioDir = path.join(output, 'audio');
  const actualAudio = (await readdir(audioDir, { recursive: true })).filter((name) => /\.(mp3|wav|ogg|opus|m4a|aac|flac)$/i.test(name));
  assert(sameIds(actualAudio, expected.map((id) => `${id}.mp3`)), 'Artifact must contain exactly fourteen approved animal MP3s; no withheld or candidate audio.');
  const bundledSources = await readJSON(path.join(audioDir, 'sources.json'));
  assert(sameIds(bundledSources.map(({ id }) => id), expected), 'Artifact credits must cover exactly the fourteen included recordings.');
  const credits = await readFile(path.join(audioDir, 'ATTRIBUTIONS.md'), 'utf8');
  for (const id of expected) {
    const entry = manifest.recordings.find((item) => item.id === id);
    const source = sources.find((item) => item.id === id);
    assert(digest(await readFile(path.join(audioDir, `${id}.mp3`))) === entry.sha256, `Artifact recording differs from reviewed bytes: ${id}`);
    assert(JSON.stringify(bundledSources.find((item) => item.id === id)) === JSON.stringify(source), `Artifact source metadata is stale: ${id}`);
    assert(credits.includes(source.creator) && credits.includes(source.license_url), `Artifact attribution is incomplete: ${id}`);
  }
  assert(digest(await readFile(path.join(audioDir, 'ESC-50-LICENSE.txt'))) === digest(await readFile(path.join(root, 'public/audio/ESC-50-LICENSE.txt'))), 'Retain the unchanged ESC-50 collection/per-recording notice.');
  const fontLicense = await readFile(path.join(output, 'licenses/Vazirmatn-OFL.txt'), 'utf8');
  assert(fontLicense.includes('SIL OPEN FONT LICENSE'), 'Vazirmatn OFL notice is missing.');
}

if (pending.length) {
  console.error(`Asset rights pending for ${target}:\n${pending.map((line) => `- ${line}`).join('\n')}`);
  if (!allowPending) process.exitCode = 1;
  else console.error('Diagnostic override only: this result does NOT clear a store release.');
} else {
  console.log(`Documented ${target} rights and exact audio hashes verified: 14 store recordings; chick, donkey and monkey excluded${artifactDir ? '; bundled files and notices checked' : ''}.`);
}
console.log('Human listening, toddler recognizability, ownership review of original project art and final store approval are separate release checks.');
