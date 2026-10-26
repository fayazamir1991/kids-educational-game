// Bundle a completed Vite build into one HTML file that works from file://.
// No server, CDN, runtime downloads, or extra build dependencies are needed.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANIMALS } from '../src/game.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const types = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

async function dataUri(url) {
  const local = path.resolve(dist, `.${url}`);
  if (!local.startsWith(`${dist}${path.sep}`)) throw new Error(`Unexpected asset path: ${url}`);
  const type = types[path.extname(local)];
  if (!type) throw new Error(`Unknown asset type: ${url}`);
  return `data:${type};base64,${(await readFile(local)).toString('base64')}`;
}

let html = await readFile(path.join(dist, 'index.html'), 'utf8');
const scriptTag = html.match(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/);
const styleTag = html.match(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/);
if (!scriptTag || !styleTag) throw new Error('Run npm run build before creating the standalone file.');

const javascript = await readFile(path.join(dist, `.${scriptTag[1]}`), 'utf8');
let css = await readFile(path.join(dist, `.${styleTag[1]}`), 'utf8');
const urls = [...new Set([...css.matchAll(/url\(["']?(\/[^)"']+)["']?\)/g)].map((match) => match[1]))];
for (const url of urls) css = css.replaceAll(url, await dataUri(url));

const assets = {};
for (const { id } of ANIMALS) {
  for (const url of [`/art/${id}.svg`, `/audio/${id}.mp3`]) assets[url] = await dataUri(url);
}
const mapScript = `globalThis.__LITTLE_FARM_ASSETS__=${JSON.stringify(assets)};`;
const escapeScript = (text) => text.replace(/<\/script/gi, '<\\/script');
html = html.replace(scriptTag[0], () => `<script>${escapeScript(mapScript)}</script>\n    <script type="module">${escapeScript(javascript)}</script>`);
html = html.replace(styleTag[0], () => `<style>${css}</style>`);
html = html.replace('href="/favicon.svg"', `href="${await dataUri('/favicon.svg')}"`);
const output = path.join(dist, 'little-farm.html');
await writeFile(output, html);
console.log(`Standalone game: ${output} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
