import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'public/narration/manifest.json'), 'utf8'));
const prompts = JSON.parse(await readFile(path.join(root, 'public/narration/prompts.json'), 'utf8')).prompts;
const normalize = (text) => text.normalize('NFC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\s]+/g, ' ').trim();
const known = new Map(prompts.map((prompt) => [prompt.id, prompt]));
const catalog = {};
const errors = [];
const seen = new Set();

if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.clips)) {
  throw new Error('Unsupported narrator manifest');
}
for (const clip of manifest.clips) {
  const prompt = known.get(clip.id);
  if (!prompt || clip.text !== prompt.text || seen.has(clip.id)) {
    errors.push(`Unknown, changed, or duplicate prompt: ${clip.id}`);
    continue;
  }
  seen.add(clip.id);
  if (!/^\/narration\/[a-z0-9-]+\.(mp3|wav)$/.test(clip.path || '')) {
    errors.push(`Invalid local narrator path: ${clip.id}`);
    continue;
  }
  try {
    const bytes = await readFile(path.join(root, 'public', clip.path));
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== clip.sha256) errors.push(`Narrator checksum mismatch: ${clip.id}`);
  } catch {
    errors.push(`Missing narrator recording: ${clip.id}`);
  }
  if (!Number.isFinite(clip.durationSeconds) || clip.durationSeconds <= 0 || clip.durationSeconds > 15) {
    errors.push(`Invalid narrator duration: ${clip.id}`);
  }
  if (clip.enabled !== true) continue;
  if (clip.redistributionApproved !== true || !clip.provenance?.license || !clip.provenance?.source) {
    errors.push(`Redistribution not documented: ${clip.id}`);
    continue;
  }
  if (clip.review?.status !== 'approved' || !clip.review?.reviewer || !clip.review?.reviewedAt) {
    errors.push(`Listening review not recorded: ${clip.id}`);
    continue;
  }
  catalog[normalize(prompt.text)] = { path: clip.path, sha256: clip.sha256 };
}
if (process.argv.includes('--require-complete')) {
  for (const prompt of prompts) {
    if (!Object.hasOwn(catalog, normalize(prompt.text))) errors.push(`Narration not ready: ${prompt.id}`);
  }
}
if (errors.length) throw new Error(errors.join('\n'));

const sourcePath = path.join(root, 'src/narration.js');
const source = await readFile(sourcePath, 'utf8');
const begin = '// BEGIN GENERATED NARRATION CATALOG';
const end = '// END GENERATED NARRATION CATALOG';
const block = `${begin}\nconst catalog = Object.freeze(${JSON.stringify(catalog, null, 2)});\n${end}`;
if (!source.includes(begin) || !source.includes(end)) throw new Error('Narrator catalog markers missing');
const expected = source.slice(0, source.indexOf(begin)) + block + source.slice(source.indexOf(end) + end.length);
if (process.argv.includes('--check')) {
  if (source !== expected) throw new Error('Run node scripts/build-narration-catalog.mjs to refresh the narrator catalog');
} else if (source !== expected) {
  await writeFile(sourcePath, expected);
}
console.log(`Narrator catalog: ${Object.keys(catalog).length}/${prompts.length} reviewed prompts available offline.`);
