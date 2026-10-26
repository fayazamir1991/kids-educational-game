import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANIMALS } from '../src/game.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async (name) => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const sources = [
  ...await readJSON('public/audio/sources-farm.json'),
  ...await readJSON('public/audio/sources-wild.json'),
];
const catalog = await readJSON('src/recordings.json');
const review = await readJSON('src/audio-review.json');
if (review.model?.sha256 !== '10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de') {
  throw new Error('Semantic screening model provenance must be reviewed when changed.');
}
if (sources.length !== ANIMALS.length || new Set(sources.map(({ id }) => id)).size !== ANIMALS.length) {
  throw new Error('The real-recording catalog must contain each animal exactly once.');
}
for (const { id } of ANIMALS) {
  const source = sources.find((item) => item.id === id);
  if (!source || source.file !== `/audio/${id}.mp3`) throw new Error(`Missing recording: ${id}`);
  for (const field of ['creator', 'source_title', 'source_url', 'license', 'license_url', 'license_evidence_url', 'sha256', 'processing']) {
    if (!source[field]) throw new Error(`Missing ${field} attribution for ${id}`);
  }
  for (const field of ['source_url', 'license_url', 'license_evidence_url', 'mirror_url']) {
    if (new URL(source[field]).protocol !== 'https:') throw new Error(`Expected verified HTTPS source for ${id}`);
  }
  const contents = await readFile(path.join(root, 'public', source.file));
  const digest = createHash('sha256').update(contents).digest('hex');
  if (digest !== source.sha256) throw new Error(`Recording changed without provenance update: ${id}`);
  if (review.animals[id]?.sha256 !== digest) throw new Error(`Semantic screening is stale: ${id}`);
  if (!['machine-screened', 'withheld'].includes(review.animals[id]?.status)) throw new Error(`Missing screening status: ${id}`);
  if (review.animals[id].enabled && review.animals[id].status !== 'machine-screened') {
    throw new Error(`Unscreened recording cannot be active: ${id}`);
  }
  if (JSON.stringify(catalog.find((item) => item.id === id)) !== JSON.stringify(source)) {
    throw new Error(`In-app credits are stale: ${id}`);
  }
  await access(path.join(root, `public/art/${id}.svg`));
}
if (catalog.length !== ANIMALS.length) throw new Error('In-app credits have missing or extra entries.');
if (JSON.stringify(await readJSON('public/audio/sources.json')) !== JSON.stringify(catalog)) {
  throw new Error('Downloadable provenance does not match in-app credits.');
}
console.log(`Verified ${ANIMALS.length} recording files, source/license records, credits, illustrations, and hash-bound screening evidence. This is not human listening.`);
