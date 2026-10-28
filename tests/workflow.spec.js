import { openAdultSettings } from './parent-helpers.js';
import { test, expect } from '@playwright/test';
import { ANIMALS, PLAYABLE_ANIMALS, AUDIO_REVIEW, createRounds } from '../src/game.js';

const rounds = createRounds(() => 0.25);

function instrumentAudio() {
  Math.random = () => 0.25;
  window.__audioStarts = [];
  window.__audioDecoded = [];
  window.__audioFetches = [];
  window.__audioStops = 0;
  const nativeFetch = window.fetch;
  window.fetch = function (...args) {
    const url = String(args[0]);
    if (/\/audio\/.*\.mp3(?:$|\?)/.test(url) || url.startsWith('data:audio/')) window.__audioFetches.push(url);
    return nativeFetch.apply(this, args);
  };
  const nativeDecode = AudioContext.prototype.decodeAudioData;
  AudioContext.prototype.decodeAudioData = function (...args) {
    return nativeDecode.apply(this, args).then((buffer) => {
      window.__audioDecoded.push({ duration: buffer.duration, sampleRate: buffer.sampleRate, frames: buffer.length });
      return buffer;
    });
  };
  const nativeStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    const result = nativeStart.apply(this, args);
    window.__audioStarts.push({ duration: this.buffer?.duration, sampleRate: this.buffer?.sampleRate, frames: this.buffer?.length });
    return result;
  };
  const nativeStop = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.stop = function (...args) {
    window.__audioStops++;
    return nativeStop.apply(this, args);
  };
}

async function expectChoices(page, choices) {
  await expect(page.locator('[data-animal]')).toHaveCount(3);
  await expect.poll(() => page.locator('[data-animal]').evaluateAll((buttons) => buttons.map((button) => button.dataset.animal).sort())).toEqual([...choices].sort());
}

async function expectStarted(page, count) {
  await expect.poll(() => page.evaluate(() => window.__audioStarts.length)).toBe(count);
  const audio = await page.evaluate(() => window.__audioStarts.at(-1));
  expect(audio.duration).toBeGreaterThan(0.5);
  expect(audio.sampleRate).toBeGreaterThanOrEqual(8000);
  expect(audio.frames).toBeGreaterThan(1000);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(instrumentAudio);
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#home-screen')).toBeVisible();
  await page.locator('#open-animal-sounds').click();
  await expect(page.locator('#listen-button')).toBeVisible();
});

test('the landscape game starts with exactly three choices and no sound before a tap', async ({ page }) => {
  await expect(page).toHaveTitle(/کی صدا کرد/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expectChoices(page, rounds[0].choices);
  await expect.poll(() => page.locator('.animal img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => window.__audioStarts.length)).toBe(0);
  await page.locator('[data-animal]').first().click();
  await expect(page.locator('#message-text')).toContainText('اول');
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/kids-landscape.png', fullPage: true });
});

test('real recordings, a gentle retry, random trios, automatic next sound, and replay work', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.locator('#listen-button').click();
  let expectedStarts = 1;
  for (const [index, round] of rounds.entries()) {
    await expectChoices(page, round.choices);
    await expectStarted(page, expectedStarts);
    if (index === 0) {
      const wrong = round.choices.find((id) => id !== round.target);
      await page.locator(`[data-animal="${wrong}"]`).click();
      await expect(page.locator('#message-text')).toContainText(/اشکالی|دوباره/);
      await expect(page.locator('#answer-feedback')).toHaveAttribute('data-kind', 'wrong');
      await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
      await expectStarted(page, ++expectedStarts);
      await expectChoices(page, round.choices);
    }
    await page.locator(`[data-animal="${round.target}"]`).click();
    await expect(page.locator('#message-text')).toContainText('آفرین');
    await expect(page.locator('.progress-flower.earned')).toHaveCount(index + 1);
    await expect(page.locator('#answer-feedback')).toHaveAttribute('data-kind', 'correct');
    await expect(page.locator('#listen-button')).toBeDisabled();
    if (index < rounds.length - 1) expectedStarts++;
  }
  await expect(page.locator('#celebration-dialog')).toBeVisible();
  await page.locator('#play-again').click();
  await expect(page.locator('#celebration-dialog')).not.toBeVisible();
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
  await expectChoices(page, rounds[0].choices);
  await expectStarted(page, ++expectedStarts);
  expect(await page.evaluate(() => window.__audioDecoded.length)).toBeGreaterThanOrEqual(5);
  expect(await page.evaluate(() => window.__audioFetches.every((url) => {
    const parsed = new URL(url, location.href);
    return parsed.pathname.endsWith('.mp3') && /^[0-9a-f]{64}$/.test(parsed.searchParams.get('v'));
  }))).toBe(true);
  expect(errors).toEqual([]);
});

test('preferences persist and the replay button recovers from mute', async ({ page }) => {
  await openAdultSettings(page);
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.locator('#volume').fill('40');
  await page.locator('#narration').uncheck();
  await page.locator('[data-close="settings-dialog"]').click();
  await page.locator('#sound-toggle').click();
  await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed', 'true');
  await openAdultSettings(page);
  await expect(page.locator('#volume')).toHaveValue('40');
  await expect(page.locator('#narration')).not.toBeChecked();
  await page.locator('#restart-button').click();
  await expect(page.locator('#settings-dialog')).not.toBeVisible();
  await page.locator('#listen-button').click();
  await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expectStarted(page, 1);
});

test('restart cancels playback and makes old answers inactive', async ({ page }) => {
  await page.locator('#listen-button').click();
  await expectStarted(page, 1);
  await openAdultSettings(page);
  await page.locator('#restart-button').click();
  await expect(page.locator('#listen-button')).not.toHaveClass(/is-playing/);
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
  await expectChoices(page, rounds[0].choices);
  await page.locator('[data-animal]').first().click();
  await expect(page.locator('#message-text')).toContainText('اول');
  expect(await page.evaluate(() => window.__audioStops)).toBeGreaterThanOrEqual(1);
});

test('mobile landscape is a single screen and portrait asks for rotation while stopping sound', async ({ page }) => {
  for (const viewport of [{ width: 667, height: 375 }, { width: 844, height: 390 }, { width: 915, height: 412 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('#orientation-notice')).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    const listen = await page.locator('#listen-button').boundingBox();
    for (const button of await page.locator('[data-animal]').all()) {
      const bounds = await button.boundingBox();
      expect(bounds.width).toBeGreaterThanOrEqual(60);
      expect(bounds.height).toBeGreaterThanOrEqual(100);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(listen.y + 2);
    }
    if (viewport.width === 844) await page.screenshot({ path: '/tmp/kids-landscape.png', fullPage: true });
  }
  await page.locator('#listen-button').click();
  await expectStarted(page, 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#orientation-notice')).toBeVisible();
  await expect(page.locator('#listen-button')).not.toHaveClass(/is-playing/);
  expect(await page.evaluate(() => window.__audioStops)).toBeGreaterThanOrEqual(1);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#orientation-notice')).not.toBeVisible();
});

test('recording sources and licenses are accessible to the parent', async ({ page }) => {
  await openAdultSettings(page);
  await page.locator('#credits-button').click();
  await expect(page.locator('#credits-dialog')).toBeVisible();
  expect(await page.locator('#credits-dialog a[href^="http"]').count()).toBeGreaterThanOrEqual(17);
  await expect(page.locator('#credits-dialog')).toContainText(/CC0|CC BY|Creative Commons/);
});

test('parents can audition actual lion/crow clips without starting the quiz and see held-out recordings', async ({ page }) => {
  const initialChoices = await page.locator('[data-animal]').evaluateAll((buttons) => buttons.map((button) => button.dataset.animal));
  const heldOut = ANIMALS.filter(({ id }) => !PLAYABLE_ANIMALS.some((animal) => animal.id === id));
  await openAdultSettings(page);
  await page.locator('.review-details summary').click();
  await expect(page.locator('#withheld-list')).toBeVisible();
  await expect(page.locator('#withheld-list li')).toHaveCount(heldOut.length);
  for (const animal of heldOut) await expect(page.locator('#withheld-list')).toContainText(animal.name);
  await page.locator('#credits-button').click();
  await expect(page.locator('[data-audition]')).toHaveCount(ANIMALS.length);
  await expect(page.locator('.review-status.withheld')).toHaveCount(heldOut.length);
  for (const [index, id] of ['lion', 'crow'].entries()) {
    const audition = page.locator(`[data-audition="${id}"]`);
    await audition.click();
    await expect(audition).toHaveAttribute('aria-pressed', 'true');
    await expectStarted(page, index + 1);
    expect(await page.evaluate(({ animalId, fingerprint }) => window.__audioFetches.some((url) => {
      const parsed = new URL(url, location.href);
      return parsed.pathname === `/audio/${animalId}.mp3` && parsed.searchParams.get('v') === fingerprint;
    }), { animalId: id, fingerprint: AUDIO_REVIEW.animals[id].sha256 })).toBe(true);
    await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
    await expect(page.locator('#round-label')).toContainText('آماده‌ای');
  }
  await page.locator('[data-close="credits-dialog"]').click();
  await expect(page.locator('#credits-dialog')).not.toBeVisible();
  await expect(page.locator('#listen-button')).not.toHaveClass(/is-playing/);
  expect(await page.locator('[data-animal]').evaluateAll((buttons) => buttons.map((button) => button.dataset.animal))).toEqual(initialChoices);
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
});
