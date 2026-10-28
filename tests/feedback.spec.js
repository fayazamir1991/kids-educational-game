import { openAdultSettings } from './parent-helpers.js';
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
  await expect(page.locator('#game-screen .game-canvas')).toHaveAttribute('data-feedback', 'wrong');
  await expect(page.locator('#answer-feedback')).toBeVisible();
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
}

async function expectReactionCleared(page) {
  await expect(page.locator('#answer-feedback')).not.toBeVisible();
  await expect(page.locator('#answer-feedback .feedback-particle')).toHaveCount(0);
  await expect(page.locator('#answer-feedback')).not.toHaveAttribute('data-effect', /.+/);
  await expect(page.locator('#game-screen .game-canvas')).not.toHaveAttribute('data-feedback', /correct|wrong/);
  await expect.poll(() => page.evaluate(() => window.__activeEffects.size)).toBe(0);
}

async function expectFullScreenReaction(page, selector, kind) {
  const layer = page.locator(selector);
  await expect(layer).toBeVisible();
  const bounds = await layer.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds.x).toBeCloseTo(0, 0);
  expect(bounds.y).toBeCloseTo(0, 0);
  expect(bounds.width).toBeCloseTo(viewport.width, 0);
  expect(bounds.height).toBeCloseTo(viewport.height, 0);
  await expect(layer.locator('.feedback-border')).toBeVisible();
  await expect(layer.locator('.feedback-emblem')).toBeVisible();
  await expect.poll(async () => (await layer.locator('.feedback-emblem').boundingBox())?.width || 0, { intervals: [25, 50, 100] }).toBeGreaterThanOrEqual(80);
  const emblem = await layer.locator('.feedback-emblem').boundingBox();
  expect(emblem.width).toBeGreaterThanOrEqual(80);
  expect(emblem.height).toBeGreaterThanOrEqual(80);
  expect(await layer.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
  if (kind === 'wrong') {
    await expect(layer).toHaveAttribute('data-effect', 'retry');
    const frame = await layer.locator('.feedback-border').evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.borderTopColor.match(/[\d.]+/g).map(Number), width: parseFloat(style.borderTopWidth) };
    });
    expect(frame.width).toBeGreaterThanOrEqual(8);
    expect(frame.color[0]).toBeGreaterThan(frame.color[1] + 60);
    expect(frame.color[0]).toBeGreaterThan(frame.color[2] + 60);
  } else {
    await expect(layer).toHaveAttribute('data-effect', /^(confetti|balloons|stars)$/);
    expect(await layer.locator('.feedback-particle').count()).toBeGreaterThanOrEqual(10);
  }
}

test('wrong and correct answers have distinct visible and musical reactions without stacked rapid taps', async ({ page }) => {
  await page.addStyleTag({ content: '.feedback-copy,.scene-message,.animal-name{visibility:hidden!important}' });
  await startAndAnswerWrong(page);
  await expect(page.locator('[data-animal]').first()).toBeDisabled();
  await expect(page.locator('#listen-button')).toBeDisabled();
  await expect(page.locator('.feedback-cloud')).toBeVisible();
  await expectFullScreenReaction(page, '#answer-feedback', 'wrong');
  const wrongOutline = await page.locator('.try-again').evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: parseFloat(style.outlineWidth), color: style.outlineColor.match(/[\d.]+/g).map(Number) };
  });
  expect(wrongOutline.width).toBeGreaterThanOrEqual(3);
  expect(wrongOutline.color[0]).toBeGreaterThan(wrongOutline.color[1] + 60);
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
  await expect(page.locator('#game-screen .game-canvas')).toHaveAttribute('data-feedback', 'correct');
  await expect(page.locator('.feedback-star')).toBeVisible();
  await expectFullScreenReaction(page, '#answer-feedback', 'correct');
  await expect(page.locator('.progress-flower.earned')).toHaveCount(1);
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
      await openAdultSettings(page);
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

test('reduced motion retains large picture-only signals and screen edges without animated particles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startAndAnswerWrong(page);
  await expectFullScreenReaction(page, '#answer-feedback', 'wrong');
  await expect(page.locator('#answer-feedback .feedback-particle')).toHaveCount(0);
  expect(await page.locator('#game-screen .game-canvas').evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.__recordingStarts)).toBe(2);
  await page.locator(`[data-animal="${first.target}"]`).click();
  await expect(page.locator('#answer-feedback')).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('.feedback-star')).toBeVisible();
  await expect(page.locator('#answer-feedback .feedback-border')).toBeVisible();
  const bounds = await page.locator('#answer-feedback .feedback-emblem').boundingBox();
  expect(bounds.width).toBeGreaterThanOrEqual(80);
  expect(bounds.height).toBeGreaterThanOrEqual(80);
  await expect(page.locator('.progress-flower.earned')).toHaveCount(1);
  await expect(page.locator('.feedback-particle')).toHaveCount(0);
  expect(await page.locator('.feedback-emblem').evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  expect(await page.locator('#game-screen .game-canvas').evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length)).toBe(0);
});

test('all three celebration styles spread across the screen and finish within the answer interval', async ({ page }) => {
  for (const [randomValue, effect] of [[0, 'confetti'], [0.4, 'balloons'], [0.8, 'stars']]) {
    await page.evaluate(async (value) => {
      const { createFeedback } = await import('/src/feedback.js');
      window.__previewFeedback?.clear();
      document.querySelector('#preview-feedback')?.remove();
      window.__previewFeedback = createFeedback(document.querySelector('#game-screen .animal-stage'), { id: 'preview-feedback', random: () => value });
      window.__previewFeedback.show('correct');
    }, randomValue);
    await expectFullScreenReaction(page, '#preview-feedback', 'correct');
    await expect(page.locator('#preview-feedback')).toHaveAttribute('data-effect', effect);
    const facts = await page.locator('#preview-feedback').evaluate(async (layer) => {
      const particles = [...layer.querySelectorAll('.feedback-particle')];
      const animations = particles.flatMap((element) => element.getAnimations());
      const endTimes = animations.map((animation) => animation.effect.getComputedTiming().endTime);
      const visible = [];
      for (const time of [350, 900, 1450]) {
        for (const animation of animations) { animation.pause(); animation.currentTime = time; }
        await new Promise(requestAnimationFrame);
        for (const particle of particles) {
          const box = particle.getBoundingClientRect();
          if (Number(getComputedStyle(particle).opacity) > 0.05 && box.right > 0 && box.left < innerWidth && box.bottom > 0 && box.top < innerHeight) visible.push({ left: box.left, right: box.right, top: box.top, bottom: box.bottom });
        }
      }
      return { count: particles.length, endTimes, visible };
    });
    expect(facts.endTimes.length).toBeGreaterThanOrEqual(facts.count);
    expect(facts.endTimes.every((time) => time > 0 && time <= 1900)).toBe(true);
    expect(facts.visible.length).toBeGreaterThanOrEqual(10);
    expect(Math.min(...facts.visible.map((box) => box.left))).toBeLessThan(page.viewportSize().width * 0.2);
    expect(Math.max(...facts.visible.map((box) => box.right))).toBeGreaterThan(page.viewportSize().width * 0.8);
    expect(Math.min(...facts.visible.map((box) => box.top))).toBeLessThan(page.viewportSize().height * 0.3);
    expect(Math.max(...facts.visible.map((box) => box.bottom))).toBeGreaterThan(page.viewportSize().height * 0.7);
    await page.screenshot({ path: `/tmp/kids-fullscreen-${effect}.png`, fullPage: true });
  }
  await page.evaluate(() => window.__previewFeedback.clear());
  await expect(page.locator('#preview-feedback .feedback-particle')).toHaveCount(0);
});

test('celebrations vary without consecutive repeats or consuming the quiz random source', async ({ page }) => {
  const facts = await page.evaluate(async () => {
    const { createFeedback } = await import('/src/feedback.js');
    const stage = document.querySelector('#game-screen .animal-stage');
    const preview = createFeedback(stage, { id: 'preview-feedback', random: () => 0.4 });
    const variants = [];
    for (let index = 0; index < 8; index++) {
      preview.show('correct');
      variants.push(document.querySelector('#preview-feedback').dataset.effect);
    }
    preview.clear();
    document.querySelector('#preview-feedback').remove();
    const nativeRandom = Math.random;
    let quizRandomCalls = 0;
    Math.random = () => { quizRandomCalls++; return 0.25; };
    try {
      const defaults = createFeedback(stage, { id: 'default-preview' });
      defaults.show('correct');
      defaults.show('wrong');
      defaults.show('correct');
      defaults.clear();
      document.querySelector('#default-preview').remove();
    } finally { Math.random = nativeRandom; }
    return { variants, quizRandomCalls };
  });
  expect(facts.variants.every((variant, index, all) => !index || variant !== all[index - 1])).toBe(true);
  expect(facts.quizRandomCalls).toBe(0);
});

test('restarting during a full-screen celebration removes every particle and pending advance', async ({ page }) => {
  await page.locator('#back-to-games').click();
  await page.locator('#open-colors').click();
  const target = await page.locator('.cs-fruit').getAttribute('data-color');
  await page.locator(`[data-drop-color="${target}"]`).click();
  await expectFullScreenReaction(page, '#mini-answer-feedback', 'correct');
  await page.locator('#mini-restart').click();
  await expect(page.locator('#mini-answer-feedback')).not.toBeVisible();
  await expect(page.locator('#mini-answer-feedback .feedback-particle')).toHaveCount(0);
  await expect(page.locator('#mini-progress .earned')).toHaveCount(0);
  await page.waitForTimeout(2100);
  await expect(page.locator('#mini-progress .earned')).toHaveCount(0);
});
