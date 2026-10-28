// Review previews only. These are not Android screenshots or final store assets.
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../..');
const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
const output = path.join(directory, 'browser-previews');
await mkdir(output, { recursive: true });
const buildManifestHash = createHash('sha256').update(await readFile(path.join(repository, 'dist-store/store-build.json'))).digest('hex');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
const records = [];
try {
  for (const id of ['catalog', 'animal-sounds', 'picture', 'lunch', 'shapes']) {
    await page.goto(`${baseUrl}/#/${id === 'catalog' ? '' : `games/${id}`}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (id !== 'catalog') await page.locator(id === 'animal-sounds' ? '#listen-button' : '#mini-game-screen').waitFor({ state: 'visible' });
    if (id === 'lunch') {
      await page.locator('[data-lunch-fruit][data-delivered="false"]').first().click();
      await page.locator('[data-lunch-friend][data-fed="false"]').first().click();
      await page.waitForTimeout(2300);
    }
    await page.evaluate(() => {
      const label = document.createElement('div');
      label.textContent = 'BROWSER PREVIEW · NOT AN ANDROID CAPTURE';
      label.style.cssText = 'position:fixed;bottom:5px;left:5px;z-index:2147483647;padding:4px 8px;border:1px solid #d2c7b1;border-radius:5px;background:#fff9ebef;color:#423b55;font:10px sans-serif;direction:ltr;pointer-events:none';
      document.body.append(label);
    });
    const filename = `browser-previews/browser-preview-${id}-960x540.png`;
    await page.screenshot({ path: path.join(directory, filename) });
    records.push({
      filename, scene: id, captureType: 'desktop_browser_review_preview',
      finalStoreScreenshot: false, nativeAndroidCapture: false,
      browserVersion: browser.version(), viewport: { width: 960, height: 540 },
      sourceBuild: 'dist-store', sourceBuildManifestSha256: buildManifestHash,
      appVersion: '1.0.0', artifactSha256: null,
      capturedAtUtc: new Date().toISOString(),
      screenshotSha256: createHash('sha256').update(await readFile(path.join(directory, filename))).digest('hex'),
      reviewed: false,
    });
  }
} finally { await browser.close(); }
const manifestPath = path.join(directory, 'provenance.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.status = 'browser_review_previews_only_native_capture_blocked';
manifest.browserPreviews = records;
manifest.nativeCaptureBlocker = 'Guest Android WebView crashed on the app and an independent official WebViewShell local data-URL reproduction. Native gameplay screenshots and gameplay/device QA remain unavailable; see native validation reports.';
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Captured ${records.length} clearly labeled browser previews. None is a native or final store screenshot.`);
