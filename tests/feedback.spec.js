import { test, expect } from '@playwright/test';
import { createRounds } from '../src/game.js';

const rounds = createRounds(() => 0.25);
const first = rounds[0];
const wrongId = first.choices.find((id) => id !== first.target);
const errors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const pageErrors = [];
  errors.set(page, pageErrors);
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    Math.random = () => 0.25;
    window.__recordingStarts = 0;
    window.__toneStarts = [];
    window.__toneStopCommands = 0;
    window.__activeEffects = new Set();
    const scheduled = new WeakMap();
    const nativeSet = AudioParam.prototype.setValueAtTime;
    AudioParam.prototype.setValueAtTime = function (value, time) {
      const values = scheduled.get(this) || [];
      values.push({ value, time });
      scheduled.set(this, values);
      return nativeSet.apply(this, arguments);
    };
    const nativeBufferStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const result = nativeBufferStart.apply(this, args);
      window.__recordingStarts++;
      return result;
    };
    const nativeToneStart = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      const result = nativeToneStart.apply(this, args);
      const id = window.__toneStarts.length;
      window.__toneStarts.push({ frequency: scheduled.get(this.frequency)?.[0]?.value ?? this.frequency.value, type: this.type });
      window.__activeEffects.add(id);
      this.addEventListener('ended', () => window.__activeEffects.delete(id), { once: true });
      return result;
    };
    const nativeToneStop = OscillatorNode.prototype.stop;
    OscillatorNode.prototype.stop = function (...args) {
      window.__toneStopCommands++;
      return nativeToneStop.apply(this, args);
    };
  });
  await page.goto('/');
  await page.locator('#open-animal-sounds').click();
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function startAndAnswerWrong(page) {
  await page.locator('#listen-button').click();
  await expect.poll(() => page.evaluate(() => window.__recordingStarts)).toBe(1);
  await page.locator(`[data-animal="${wrongId}"]`).click();
  await expect(page.locator('#answer-feedback')).toHaveAttribute('data-kind', 'wrong');
  await expect(page.locator('.game-canvas')).toHaveAttribute('data-feedback', 'wrong');
  await expect(page.locator('#answer-feedback')).toBeVisible();
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
}

async function expectReactionCleared(page) {
  await expect(page.locator('#answer-feedback')).not.toBeVisible();
  await expect(page.locator('.game-canvas')).not.toHaveAttribute('data-feedback', /correct|wrong/);
  await expect.poll(() => page.evaluate(() => window.__activeEffects.size)).toBe(0);
}

test('wrong and correct answers have distinct visible and musical reactions without stacked rapid taps', async ({ page }) => {
  await startAndAnswerWrong(page);
  await expect(page.locator('[data-animal]').first()).toBeDisabled();
  await expect(page.locator('#listen-button')).toBeDisabled();
  await expect(page.locator('.feedback-cloud')).toBeVisible();
  await expect(page.locator('.feedback-copy strong')).toContainText('اوپس');
  await expect.poll(() => page.locator('.feedback-banner').evaluate((element) => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0.9);
  const wrongBackground = await page.locator('.feedback-banner').evaluate((element) => getComputedStyle(element).backgroundColor);
  const wrongNotes = await page.evaluate(() => window.__toneStarts.map(({ frequency }) => frequency));
  expect(wrongNotes.length).toBeGreaterThan(0);
  await page.evaluate(() => {
    for (let i = 0; i < 6; i++) document.querySelector('[data-animal]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  expect(await page.evaluate(() => window.__toneStarts.length)).toBe(wrongNotes.length);
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/kids-feedback-wrong.png', fullPage: true });
  await expect.poll(() => page.evaluate(() => window.__recordingStarts)).toBe(2);
  await expect(page.locator('#answer-feedback')).not.toBeVisible();
  expect(await page.locator('[data-animal]').evaluateAll((buttons) => buttons.map((button) => button.dataset.animal).sort())).toEqual([...first.choices].sort());
  await expect(page.locator('#round-label')).toContainText('۱');
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);

  await page.locator(`[data-animal="${first.target}"]`).click();
  await expect(page.locator('#answer-feedback')).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('.game-canvas')).toHaveAttribute('data-feedback', 'correct');
  await expect(page.locator('.feedback-star')).toBeVisible();
  await expect(page.locator('.feedback-copy strong')).toContainText('آفر');
  await expect(page.locator('.progress-flower.earned')).toHaveCount(1);
  await expect.poll(() => page.locator('.feedback-banner').evaluate((element) => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0.9);
  expect(await page.locator('.feedback-banner').evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(wrongBackground);
  const correctNotes = await page.evaluate((offset) => window.__toneStarts.slice(offset).map(({ frequency }) => frequency), wrongNotes.length);
  expect(correctNotes.length).toBeGreaterThan(wrongNotes.length);
  expect(correctNotes).not.toEqual(wrongNotes);
  const totalNotes = await page.evaluate(() => window.__toneStarts.length);
  await page.evaluate((target) => {
    const button = document.querySelector(`[data-animal="${target}"]`);
    for (let i = 0; i < 6; i++) button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, first.target);
  expect(await page.evaluate(() => window.__toneStarts.length)).toBe(totalNotes);
  await expect(page.locator('.progress-flower.earned')).toHaveCount(1);
  await page.screenshot({ path: '/tmp/kids-feedback-correct.png', fullPage: true });
  await expect.poll(() => page.evaluate(() => window.__recordingStarts)).toBe(3);
  expect(await page.locator('[data-animal]').evaluateAll((buttons) => buttons.map((button) => button.dataset.animal).sort())).toEqual([...rounds[1].choices].sort());
  await expect(page.locator('.progress-flower.earned')).toHaveCount(1);
});

test('leaving during a wrong reaction cancels its sound and replay timer and reentry is fresh', async ({ page }) => {
  await startAndAnswerWrong(page);
  const stopCommands = await page.evaluate(() => window.__toneStopCommands);
  await page.locator('#back-to-games').click();
  await expect(page.locator('#home-screen')).toBeVisible();
  await expectReactionCleared(page);
  expect(await page.evaluate(() => window.__toneStopCommands)).toBeGreaterThan(stopCommands);
  await page.waitForTimeout(1650); // Past the 1400ms retry timer.
  expect(await page.evaluate(() => window.__recordingStarts)).toBe(1);
  await page.locator('#open-animal-sounds').click();
  await expectReactionCleared(page);
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
  await expect(page.locator('#round-label')).toContainText('آماده‌ای');
  await page.locator('[data-animal]').first().click();
  await expect(page.locator('#message-text')).toContainText('اول');
});

for (const pause of ['modal', 'rotation']) {
  test(`${pause} clears wrong-answer feedback and prevents the queued retry`, async ({ page }) => {
    await startAndAnswerWrong(page);
    if (pause === 'modal') {
      await page.locator('#settings-button').click();
      await expect(page.locator('#settings-dialog')).toBeVisible();
    } else {
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator('#orientation-notice')).toBeVisible();
    }
    await expectReactionCleared(page);
    await page.waitForTimeout(1650);
    expect(await page.evaluate(() => window.__recordingStarts)).toBe(1);
    if (pause === 'modal') await page.locator('[data-close="settings-dialog"]').click();
    else await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#listen-button')).toBeEnabled();
    expect(await page.locator('[data-animal]').evaluateAll((buttons) => buttons.map((button) => button.dataset.animal).sort())).toEqual([...first.choices].sort());
  });
}

test('muting clears feedback tones and prevents a queued replay or new feedback sounds', async ({ page }) => {
  await startAndAnswerWrong(page);
  const notes = await page.evaluate(() => window.__toneStarts.length);
  await page.locator('#sound-toggle').click();
  await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expectReactionCleared(page);
  await page.locator('[data-animal]').first().click();
  await expect(page.locator('#message-text')).toContainText('اول');
  await page.waitForTimeout(1650);
  expect(await page.evaluate(() => window.__toneStarts.length)).toBe(notes);
  expect(await page.evaluate(() => window.__recordingStarts)).toBe(1);
});

test('reduced motion retains a clear static answer badge without animated particles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#listen-button').click();
  await expect.poll(() => page.evaluate(() => window.__recordingStarts)).toBe(1);
  await page.locator(`[data-animal="${first.target}"]`).click();
  await expect(page.locator('#answer-feedback')).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('.feedback-star')).toBeVisible();
  await expect(page.locator('.feedback-copy strong')).toContainText('آفر');
  await expect(page.locator('.progress-flower.earned')).toHaveCount(1);
  await expect(page.locator('.feedback-spark')).toHaveCount(0);
  expect(await page.locator('.feedback-banner').evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  expect(await page.locator('.game-canvas').evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length)).toBe(0);
});
