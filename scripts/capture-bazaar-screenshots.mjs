// Actual shipped UI rendered in Chromium, NOT native Android/device captures.
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRounds } from '../src/game.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'store/screenshots/bazaar-10');
const url = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:4183';
const apk = path.join(root, 'release/bazaar-v1/kids-garden-1.0.0.apk');
const sha = (data) => createHash('sha256').update(data).digest('hex');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript(() => { Math.random = () => 0.25; });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
const entries = [];
const scenes = [
  ['01-catalog', null, 'فهرست بازی‌ها'],
  ['02-animal-sounds', 'animal-sounds', 'کی صدا کرد؟'],
  ['03-picture-detective', 'picture', 'کارآگاه تصویر'],
  ['04-color-baskets', 'colors', 'سبدهای رنگی'],
  ['05-shape-house', 'shapes', 'خانهٔ شکل‌ها'],
  ['06-friends-lunch', 'lunch', 'ناهار سه دوست'],
  ['07-feed-the-rabbit', 'counting', 'به خرگوش غذا بده'],
  ['08-little-puzzle', 'puzzle', 'پازل کوچولو'],
  ['09-big-and-small', 'sizes', 'بزرگ و کوچولو'],
  ['10-celebration', 'animal-sounds', 'جشن پاسخ درست'],
];
try {
  for (const [name, game, title] of scenes) {
    await page.goto(`${url}/#/${game ? `games/${game}` : ''}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((i) => i.complete && i.naturalWidth > 0))).toBe(true);
    if (game === 'lunch') {
      await page.locator('[data-lunch-fruit][data-delivered="false"]').first().tap();
      await page.locator('[data-lunch-friend][data-fed="false"]').first().tap();
      await expect(page.locator('[data-lunch-friend][data-fed="true"]')).toHaveCount(1);
      await page.waitForTimeout(2100);
    }
    if (game === 'counting') {
      const count = await page.locator('.count-goal-carrots > svg').count();
      for (let i = 0; i < count; i++) await page.locator(`[data-carrot="${i}"]`).tap();
    }
    if (game === 'puzzle') {
      await page.locator('[data-piece="0"]').tap();
      await page.locator('[data-slot="0"]').tap();
      await expect(page.locator('.puzzle-slot[data-placed="true"]')).toHaveCount(1);
      await page.waitForTimeout(2100);
      await page.locator('[data-piece="1"]').tap();
    }
    if (name === '10-celebration') {
      await page.locator('#listen-button').tap();
      await expect(page.locator('#message-text')).toContainText('صدای کدوم', { timeout: 20000 });
      await page.locator(`[data-animal="${createRounds(() => 0.25)[0].target}"]`).tap();
      await expect(page.locator('#answer-feedback')).toHaveAttribute('data-kind', 'correct');
      await page.waitForTimeout(450);
    }
    const filename = `${name}.jpg`;
    await page.screenshot({ path: path.join(output, filename), type: 'jpeg', quality: 95 });
    const bytes = await readFile(path.join(output, filename));
    entries.push({ filename, title, width: 1920, height: 1080, bytes: bytes.length, sha256: sha(bytes), capture: 'shipped-apk-ui-in-mobile-chromium', nativeAndroidCapture: false });
  }
  if (errors.length) throw new Error(JSON.stringify(errors));
  await writeFile(path.join(output, 'provenance.json'), JSON.stringify({
    appVersion: '1.0.0', sourceApk: path.relative(root, apk), sourceApkSha256: sha(await readFile(apk)),
    source: 'Unmodified assets/public extracted from the signed APK; rendered in mobile Chromium. No game UI elements added or removed.',
    browserVersion: browser.version(), capturedAt: new Date().toISOString(), viewport: { width: 960, height: 540 }, deviceScaleFactor: 2,
    nativeAndroidCapture: false, physicalDeviceComparisonPending: true, finalStoreApproval: false, errors, entries,
  }, null, 2) + '\n');
  console.log(JSON.stringify(entries.map(({ filename, bytes }) => ({ filename, bytes })), null, 2));
} finally { await browser.close(); }
