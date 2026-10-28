import { test, expect } from '@playwright/test';
import { solveParentGate } from './parent-helpers.js';

const words = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];

async function openParents(page) {
  await page.locator('#parents-button').click();
  if (await page.locator('#parent-gate').isVisible()) await solveParentGate(page);
  await expect(page.locator('#parents-dialog')).toBeVisible();
}

// The isolated fixture exercises lifecycle and callback boundaries without a
// production test hook, persistent authorization token, or network navigation.
async function parentFixture(page) {
  await page.route('**/__parents_fixture.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html dir="rtl" lang="fa"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif}button{font:inherit}</style></head><body><button id="fixture-open">والدین</button><dialog id="settings-dialog"><button id="fixture-settings-close">بستن</button></dialog><dialog id="credits-dialog"></dialog><script type="module">
      import { createParentArea } from '/src/parents.js';
      window.calls = { pause: 0, resume: 0, settings: 0, credits: 0, external: [], reset: 0 };
      window.parents = createParentArea({
        onPause: () => calls.pause++, onResume: () => calls.resume++,
        onOpenSettings: () => { calls.settings++; document.querySelector('#settings-dialog').showModal(); },
        onOpenCredits: () => { calls.credits++; document.querySelector('#credits-dialog').showModal(); },
        onExternal: (url) => { calls.external.push(url); return window.externalResult; }, onResetPreferences: () => calls.reset++,
      });
      document.querySelector('#fixture-open').onclick = () => parents.open();
      document.querySelector('#fixture-settings-close').onclick = () => document.querySelector('#settings-dialog').close();
      window.fixtureReady = true;
    </script></body></html>`,
  }));
  await page.goto('/__parents_fixture.html');
  await expect.poll(() => page.evaluate(() => window.fixtureReady)).toBe(true);
}

test('the home parents entry requires the reading sequence; a wrong choice or cancel never opens it', async ({ page }) => {
  await page.goto('/');
  await page.locator('#parents-button').click();
  await expect(page.locator('#parent-gate')).toBeVisible();
  await expect(page.locator('#parents-dialog')).not.toBeVisible();
  const firstWord = await page.locator('[data-parent-step-word]').first().textContent();
  const first = words.indexOf(firstWord.trim());
  const wrongDigit = await page.locator(`[data-parent-digit]:not([data-parent-digit="${first}"])`).first().getAttribute('data-parent-digit');
  await page.locator(`[data-parent-digit="${wrongDigit}"]`).click();
  await expect(page.locator('#parent-gate-status')).toContainText('ترتیب درست نبود');
  await expect(page.locator('[data-complete="true"]')).toHaveCount(0);
  await expect(page.locator('#parents-dialog')).not.toBeVisible();
  await page.locator('#parent-gate-cancel').click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('#home-screen')).toBeVisible();
  await expect(page.locator('#parents-button')).toBeFocused();
  await openParents(page);
  await expect(page.locator('#parent-publisher')).toHaveAttribute('data-publication-status', 'unconfigured');
  await expect(page.locator('[data-parent-publisher-status]')).toContainText('پیش از انتشار');
  await page.locator('#parents-privacy').click();
  await expect(page.locator('#parent-privacy-dialog')).toBeVisible();
  await expect(page.locator('#parent-privacy-dialog')).toContainText('میکروفن');
  await expect(page.locator('#parent-privacy-dialog')).toContainText('احراز هویت');
  await expect(page.locator('#parent-privacy-dialog')).toContainText('سرویس گفتار ابری استفاده نمی‌کند');
  await page.locator('#parent-privacy-back').click();
  await expect(page.locator('#parents-dialog')).toBeVisible();
  await page.locator('#parents-close').click();
  await page.locator('#parents-button').click();
  await expect(page.locator('#parent-gate')).toBeVisible();
  await expect(page.locator('#parents-dialog')).not.toBeVisible();
});

test('opening animal settings stops playback before the gate; cancelling leaves a playable game', async ({ page }) => {
  await page.addInitScript(() => {
    window.audioStarts = 0;
    window.audioStops = 0;
    const start = AudioBufferSourceNode.prototype.start;
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...args) {
      // Keep the recording active until the parent action cancels it, even on
      // a busy CI machine where a short animal call might otherwise finish.
      this.loop = true;
      window.audioStarts++;
      return start.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args) { window.audioStops++; return stop.apply(this, args); };
  });
  await page.goto('/');
  await page.locator('#open-animal-sounds').click();
  await page.locator('#listen-button').click();
  await expect.poll(() => page.evaluate(() => audioStarts)).toBe(1);
  await page.locator('#settings-button').click();
  await expect(page.locator('#parent-gate')).toBeVisible();
  await expect(page.locator('#settings-dialog')).not.toBeVisible();
  expect(await page.evaluate(() => audioStops)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('#listen-button')).toBeEnabled();
  await page.locator('#settings-button').click();
  await solveParentGate(page);
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await expect(page.locator('#volume')).toBeEnabled();
});

test('mini-game settings also require the gate and preferences reset only after adult confirmation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('little-farm-settings', JSON.stringify({ volume: 0.4, muted: true, narration: false })));
  await page.goto('/');
  await page.locator('#open-colors').click();
  await page.locator('#mini-settings').click();
  await expect(page.locator('#parent-gate')).toBeVisible();
  await solveParentGate(page);
  await expect(page.locator('#volume')).toHaveValue('40');
  await expect(page.locator('#narration')).not.toBeChecked();
  await page.locator('[data-close="settings-dialog"]').click();
  await page.locator('#mini-back').click();
  await expect(page.locator('#home-screen')).toBeVisible();
  await openParents(page);
  await page.locator('#parents-reset').click();
  await expect(page.locator('#parent-reset-dialog')).toBeVisible();
  await page.locator('#parent-reset-cancel').click();
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('little-farm-settings'))).volume).toBe(0.4);
  await page.locator('#parents-reset').click();
  await page.locator('#parent-reset-confirm').click();
  await expect(page.locator('#parents-status')).toContainText('به حالت اولیه');
  expect(await page.evaluate(() => localStorage.getItem('little-farm-settings'))).toBeNull();
  await page.locator('#parents-settings').click();
  await expect(page.locator('#volume')).toHaveValue('65');
  await expect(page.locator('#narration')).toBeChecked();
});

test('credits links are delegated to the browser only inside a current adult session', async ({ page }) => {
  await page.addInitScript(() => { window.openedUrls = []; window.open = (url) => { window.openedUrls.push(url); return null; }; });
  await page.goto('/');
  await page.locator('#parents-button').click();
  expect(await page.evaluate(() => openedUrls)).toEqual([]);
  await solveParentGate(page);
  await page.locator('#parents-credits').click();
  await expect(page.locator('#credits-dialog')).toBeVisible();
  const link = page.locator('#credits-dialog a[href^="https:"]').first();
  const href = await link.getAttribute('href');
  await link.click();
  await expect.poll(() => page.evaluate(() => openedUrls)).toEqual([href]);
  await page.locator('[data-close="credits-dialog"]').click();
  await page.reload();
  await page.locator('#parents-button').click();
  await expect(page.locator('#parent-gate')).toBeVisible();
  await expect(page.locator('#parents-dialog')).not.toBeVisible();
  expect(await page.evaluate(() => openedUrls)).toEqual([]);
});

test('external callback is not called on cancel, invalid URLs, or a renewed locked challenge', async ({ page }) => {
  await parentFixture(page);
  for (const url of ['http://example.com', 'javascript:alert(1)', 'https://user:password@example.com', '/relative']) {
    expect(await page.evaluate((value) => parents.openExternal(value), url)).toBe(false);
  }
  expect(await page.evaluate(() => calls.pause)).toBe(0);
  await page.evaluate(() => parents.openExternal('https://example.com/license'));
  await page.locator('#parent-gate-return').click();
  expect(await page.evaluate(() => calls.external)).toEqual([]);
  await page.evaluate(() => parents.openExternal('https://example.com/source'));
  await solveParentGate(page);
  expect(await page.evaluate(() => calls.external)).toEqual(['https://example.com/source']);
  await page.evaluate(() => { parents.lock(); parents.openExternal('https://example.com/other'); });
  await expect(page.locator('#parent-gate')).toBeVisible();
  expect(await page.evaluate(() => calls.external)).toEqual(['https://example.com/source']);
  await solveParentGate(page);
  expect(await page.evaluate(() => calls.external)).toEqual(['https://example.com/source', 'https://example.com/other']);
});

test('adult authorization expires in memory and closes privileged settings after five minutes', async ({ page }) => {
  await page.clock.install();
  await parentFixture(page);
  await page.evaluate(() => parents.openSettings());
  await solveParentGate(page);
  await expect(page.locator('#settings-dialog')).toBeVisible();
  expect(await page.evaluate(() => parents.hasSession())).toBe(true);
  await page.clock.fastForward(5 * 60 * 1000 + 1);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await page.evaluate(() => parents.hasSession())).toBe(false);
  await page.evaluate(() => parents.openSettings());
  await expect(page.locator('#parent-gate')).toBeVisible();
  expect(await page.evaluate(() => calls.settings)).toBe(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('a delayed external-service error cannot reopen a locked parent area', async ({ page }) => {
  await parentFixture(page);
  await page.evaluate(() => {
    window.externalResult = new Promise((resolve, reject) => { window.rejectExternal = reject; });
    parents.openExternal('https://example.com/license');
  });
  await solveParentGate(page);
  await page.evaluate(async () => {
    parents.lock();
    rejectExternal(new Error('External browser unavailable'));
    await Promise.resolve();
    await Promise.resolve();
  });
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await page.evaluate(() => parents.hasSession())).toBe(false);
  await page.evaluate(() => parents.open());
  await expect(page.locator('#parent-gate')).toBeVisible();
});

test('backgrounding locks the parent session without resuming a hidden game; back and destroy discard pending actions', async ({ page }) => {
  await parentFixture(page);
  await page.locator('#fixture-open').click();
  await solveParentGate(page);
  await page.locator('#parents-privacy').click();
  expect(await page.evaluate(() => parents.handleBack())).toBe(true);
  await expect(page.locator('#parents-dialog')).toBeVisible();
  const resumes = await page.evaluate(() => calls.resume);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await page.evaluate(() => parents.hasSession())).toBe(false);
  expect(await page.evaluate(() => calls.resume)).toBe(resumes);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    parents.openSettings();
  });
  await expect(page.locator('#parent-gate')).toBeVisible();
  expect(await page.evaluate(() => parents.handleBack())).toBe(true);
  expect(await page.evaluate(() => parents.handleBack())).toBe(false);
  expect(await page.evaluate(() => calls.settings)).toBe(0);
  await page.evaluate(() => { parents.openSettings(); parents.destroy(); });
  await expect(page.locator('.parent-area')).toHaveCount(0);
  expect(await page.evaluate(() => parents.openSettings())).toBe(false);
  expect(await page.evaluate(() => calls.settings)).toBe(0);
});

test('parent challenge and policy remain readable without horizontal overflow on small phones', async ({ page }) => {
  await page.goto('/');
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.locator('#parents-button').click();
    await expect(page.locator('#parent-gate')).toBeVisible();
    await expect(page.locator('[data-parent-digit]')).toHaveCount(6);
    expect(await page.locator('#parent-gate').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const button of await page.locator('[data-parent-digit]').all()) {
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await expect(button).toBeInViewport();
    }
    await expect(page.locator('#parent-gate-return')).toBeInViewport();
    await page.locator('#parent-gate-cancel').click();
  }
});

test('both standalone policies load locally with accurate audio wording and unfilled publisher fields', async ({ page }) => {
  const externalRequests = [];
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });
  await page.setViewportSize({ width: 320, height: 568 });
  for (const language of ['fa', 'en']) {
    await page.goto(`/privacy-${language}.html`);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('html')).toHaveAttribute('data-publication-status', 'unconfigured');
    await expect(page.locator('[data-publisher-field="publisherName"]')).toContainText(language === 'fa' ? 'تکمیل' : 'completed');
    await expect(page.locator('body')).toContainText(language === 'fa' ? 'سرویس گفتار ابری استفاده نمی‌کند' : 'does not use cloud speech');
    await expect(page.locator('script, iframe, form')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(externalRequests).toEqual([]);
});
