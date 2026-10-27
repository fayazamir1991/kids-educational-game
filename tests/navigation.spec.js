import { test, expect } from '@playwright/test';
import { createRounds } from '../src/game.js';

const rounds = createRounds(() => 0.25);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.25;
    window.__audioStarts = 0;
    window.__audioStops = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const result = start.apply(this, args);
      window.__audioStarts++;
      return result;
    };
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop = function (...args) {
      const result = stop.apply(this, args);
      window.__audioStops++;
      return result;
    };
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
});

test('portrait opens the game collection and can enter, rotate, and return from the animal game', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#home-screen')).toBeVisible();
  await expect(page.locator('#game-screen')).not.toBeVisible();
  await expect(page.locator('#orientation-notice')).not.toBeVisible();
  await expect(page.locator('#home-screen [data-open-game]')).toHaveCount(6);
  expect(await page.locator('#home-screen [data-open-game]').evaluateAll((buttons) => buttons.map((button) => button.dataset.openGame).sort())).toEqual(['animal-sounds', 'colors', 'counting', 'puzzle', 'shapes', 'sizes']);
  await expect(page.locator('#home-screen [data-open-game]').first()).toBeInViewport();
  await expect(page.locator('#open-animal-sounds')).toBeEnabled();
  expect(await page.evaluate(() => window.__audioStarts)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/kids-hub-mobile.png', fullPage: true });

  await page.locator('#open-animal-sounds').click();
  await expect(page).toHaveURL(/#\/games\/animal-sounds$/);
  await expect(page.locator('#home-screen')).not.toBeVisible();
  await expect(page.locator('#orientation-notice')).toBeVisible();
  await page.locator('#orientation-back').click();
  await expect(page.locator('#home-screen')).toBeVisible();
  await expect(page.locator('#orientation-notice')).not.toBeVisible();
  expect(await page.evaluate(() => window.__audioStarts)).toBe(0);

  await page.locator('#open-animal-sounds').click();
  await expect(page.locator('#orientation-notice')).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#orientation-notice')).not.toBeVisible();
  await expect(page.locator('#listen-button')).toBeVisible();
  await page.locator('#back-to-games').click();
  await expect(page.locator('#home-screen')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/kids-hub-landscape.png', fullPage: true });
});

test('returning home cancels pending next-round audio and reentering starts a fresh quiet game', async ({ page }) => {
  await page.locator('#open-animal-sounds').click();
  await page.locator('#listen-button').click();
  await expect.poll(() => page.evaluate(() => window.__audioStarts)).toBe(1);
  await page.locator(`[data-animal="${rounds[0].target}"]`).click();
  await expect(page.locator('.progress-flower.earned')).toHaveCount(1);
  await page.locator('#back-to-games').click();
  await expect(page.locator('#home-screen')).toBeVisible();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.waitForTimeout(2250); // Covers the cancelled 1900ms correct-answer timer.
  expect(await page.evaluate(() => window.__audioStarts)).toBe(1);

  await page.locator('#open-animal-sounds').click();
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
  await expect(page.locator('#round-label')).toContainText('آماده‌ای');
  expect(await page.evaluate(() => window.__audioStarts)).toBe(1);
  await page.locator('[data-animal]').first().click();
  await expect(page.locator('#message-text')).toContainText('اول');

  await page.locator('#listen-button').click();
  await expect.poll(() => page.evaluate(() => window.__audioStarts)).toBe(2);
  const stops = await page.evaluate(() => window.__audioStops);
  await page.locator('#back-to-games').click();
  await expect(page.locator('#home-screen')).toBeVisible();
  expect(await page.evaluate(() => window.__audioStops)).toBeGreaterThan(stops);
});

test('browser history closes previews and routes deep links and unknown games safely', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.locator('#open-animal-sounds').click();
  await page.locator('#settings-button').click();
  await page.locator('#credits-button').click();
  await page.locator('[data-audition="lion"]').click();
  await expect.poll(() => page.evaluate(() => window.__audioStarts)).toBe(1);
  await page.goBack();
  await expect(page.locator('#home-screen')).toBeVisible();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__audioStops)).toBeGreaterThanOrEqual(1);
  await page.goForward();
  await expect(page.locator('#listen-button')).toBeVisible();
  await expect(page.locator('#round-label')).toContainText('آماده‌ای');
  expect(await page.evaluate(() => window.__audioStarts)).toBe(1);

  // Reload the game deep link to exercise startup routing in a fresh document.
  // Navigating to the same hash can preserve the current document and counters.
  await page.reload();
  await expect(page.locator('#home-screen')).not.toBeVisible();
  await expect(page.locator('#listen-button')).toBeVisible();
  expect(await page.evaluate(() => window.__audioStarts)).toBe(0);
  await page.goto('/#/games/unknown-game');
  await expect(page.locator('#home-screen')).toBeVisible();
  await expect(page.locator('#orientation-notice')).not.toBeVisible();
  await expect(page).toHaveURL(/\/(?:#\/)?$/);
  expect(errors).toEqual([]);
});
