import { test, expect } from '@playwright/test';

const games = ['colors', 'shapes', 'counting', 'puzzle', 'sizes'];
const earned = (page) => page.locator('#mini-progress .earned');
const errors = new WeakMap();

async function expectFullFrame(page, kind) {
  const layer = page.locator('#mini-answer-feedback');
  const bounds = await layer.boundingBox();
  expect(bounds.x).toBeCloseTo(0, 0);
  expect(bounds.y).toBeCloseTo(0, 0);
  expect(bounds.width).toBeCloseTo(page.viewportSize().width, 0);
  expect(bounds.height).toBeCloseTo(page.viewportSize().height, 0);
  await expect(layer.locator('.feedback-emblem')).toBeVisible();
  await expect.poll(async () => (await layer.locator('.feedback-emblem').boundingBox())?.width || 0, { intervals: [25, 50, 100] }).toBeGreaterThanOrEqual(80);
  if (kind === 'wrong') {
    await expect(layer).toHaveAttribute('data-effect', 'retry');
    const color = await page.locator('#mini-content .try-again').evaluate((element) => getComputedStyle(element).outlineColor.match(/[\d.]+/g).map(Number));
    expect(color[0]).toBeGreaterThan(color[1] + 60);
  } else {
    await expect(layer).toHaveAttribute('data-effect', /^(confetti|balloons|stars)$/);
    expect(await layer.locator('.feedback-particle').count()).toBeGreaterThanOrEqual(10);
  }
}

async function cue(page, game) {
  if (game === 'colors') return page.locator('.cs-fruit').getAttribute('data-color');
  if (game === 'shapes') return page.locator('.sg-piece').getAttribute('data-shape');
  if (game === 'counting') return page.locator('.count-goal-carrots > svg').count();
  if (game === 'sizes') return page.locator('.sizes-reference.is-requested').getAttribute('data-reference-size');
  return page.locator('.puzzle-guide').getAttribute('src');
}

async function answer(page, game, correct = true, piece = 0) {
  const target = await cue(page, game);
  if (game === 'colors' || game === 'shapes') {
    const attribute = game === 'colors' ? 'data-drop-color' : 'data-drop-shape';
    if (correct) await page.locator(`[${attribute}="${target}"]`).click();
    else await page.locator(`[${attribute}]:not([${attribute}="${target}"])`).first().click();
  } else if (game === 'counting') {
    const amount = correct ? target : target === 1 ? 2 : 1;
    for (let index = 0; index < amount; index++) await page.locator(`[data-carrot="${index}"]`).click();
    await page.locator('[data-action="feed"]').click();
  } else if (game === 'sizes') {
    await page.locator(`[data-size="${correct ? target : target === 'large' ? 'small' : 'large'}"]`).click();
  } else {
    await page.locator(`[data-piece="${piece}"]`).click();
    await page.locator(`[data-slot="${correct ? piece : (piece + 1) % 3}"]`).click();
  }
}

test.beforeEach(async ({ page }) => {
  const pageErrors = [];
  errors.set(page, pageErrors);
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    Math.random = () => 0.25;
    window.__recordingStarts = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const result = start.apply(this, args);
      window.__recordingStarts++;
      return result;
    };
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

for (const game of games) {
  test(`${game}: wrong answers retain the challenge and a full session completes without duplicate rewards`, async ({ page }) => {
    await page.locator(`#open-${game}`).click();
    await expect(page.locator('#mini-game-screen')).toBeVisible();
    await expect(earned(page)).toHaveCount(0);
    const firstCue = await cue(page, game);
    await answer(page, game, false);
    await expect(page.locator('#mini-answer-feedback')).toHaveAttribute('data-kind', 'wrong');
    await expect(page.locator('#mini-answer-feedback .feedback-cloud')).toBeVisible();
    await expectFullFrame(page, 'wrong');
    await expect(earned(page)).toHaveCount(0);
    await expect(page.locator('#mini-help')).toBeDisabled();
    await expect(page.locator('#mini-answer-feedback')).not.toBeVisible();
    expect(await cue(page, game)).toBe(firstCue);
    await expect(earned(page)).toHaveCount(0);
    if (game === 'counting') await expect(page.locator('[data-carrot][aria-pressed="true"]')).toHaveCount(0);

    const roundCount = game === 'puzzle' ? 3 : 5;
    const seen = new Set();
    for (let index = 0; index < roundCount; index++) {
      seen.add(await cue(page, game));
      await answer(page, game, true, index);
      await expect(earned(page)).toHaveCount(index + 1);
      await expect(page.locator('#mini-answer-feedback')).toHaveAttribute('data-kind', 'correct');
      await expect(page.locator('#mini-answer-feedback .feedback-star')).toBeVisible();
      if (index === 0) await expectFullFrame(page, 'correct');
      await page.locator('#mini-content').evaluate((mount) => {
        const buttons = [...mount.querySelectorAll('button')];
        for (let tap = 0; tap < 4; tap++) for (const button of buttons) button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await expect(earned(page)).toHaveCount(index + 1);
      await expect(page.locator('#mini-answer-feedback')).not.toBeVisible();
      if (game === 'puzzle') {
        await expect(page.locator('.puzzle-slot[data-placed="true"]')).toHaveCount(index + 1);
        await expect(page.locator('.puzzle-piece[data-placed="true"]')).toHaveCount(index + 1);
      }
    }
    if (['colors', 'shapes', 'counting'].includes(game)) expect(seen.size).toBe(3);
    if (game === 'sizes') expect(seen.size).toBe(2);
    await expect(page.locator('#mini-finish')).toBeVisible();
    await page.locator('#mini-play-again').click();
    await expect(page.locator('#mini-finish')).not.toBeVisible();
    await expect(earned(page)).toHaveCount(0);
    await expect(page.locator('#mini-help')).toBeEnabled();
    if (game === 'puzzle') await expect(page.locator('.puzzle-slot[data-placed="true"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.__recordingStarts)).toBe(0);
  });
}

test('every new home entry and deep link routes independently; leaving feedback cancels its transition', async ({ page }) => {
  await expect(page.locator('[data-open-game]')).toHaveCount(8);
  for (const game of games) {
    await page.locator(`#open-${game}`).click();
    await expect(page).toHaveURL(new RegExp(`#/games/${game}$`));
    await expect(page.locator('#game-screen')).not.toBeVisible();
    await answer(page, game);
    await expect(earned(page)).toHaveCount(1);
    await page.locator('#mini-back').click();
    await expect(page.locator('#home-screen')).toBeVisible();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.locator('#mini-answer-feedback')).not.toBeVisible();
    await expect(page.locator('#mini-answer-feedback .feedback-particle')).toHaveCount(0);
    await page.waitForTimeout(2100);
    await page.goto(`/#/games/${game}`);
    await expect(page.locator('#mini-game-screen')).toBeVisible();
    await expect(earned(page)).toHaveCount(0);
    await page.reload();
    await expect(page.locator('#mini-game-screen')).toBeVisible();
    await expect(earned(page)).toHaveCount(0);
    await page.locator('#mini-back').click();
  }
});

test('shared settings restart the active game and rotation preserves its challenge', async ({ page }) => {
  await page.locator('#open-colors').click();
  await answer(page, 'colors');
  await page.locator('#mini-settings').click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await expect(page.locator('#credits-button')).not.toBeVisible();
  await page.locator('#narration').uncheck();
  await page.locator('#restart-button').click();
  await expect(page.locator('#settings-dialog')).not.toBeVisible();
  await expect(earned(page)).toHaveCount(0);
  await page.waitForTimeout(2100);
  await expect(earned(page)).toHaveCount(0);
  const target = await cue(page, 'colors');
  await answer(page, 'colors', false);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#mini-orientation-notice')).toBeVisible();
  await expect(page.locator('#mini-answer-feedback')).not.toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#mini-orientation-notice')).not.toBeVisible();
  expect(await cue(page, 'colors')).toBe(target);
  await expect(earned(page)).toHaveCount(0);
  await expect(page.locator('#mini-help')).toBeEnabled();
  await page.locator('#mini-restart').click();
  await expect(earned(page)).toHaveCount(0);
});

test('the matching games accept real pointer dragging as well as tapping', async ({ page }) => {
  for (const game of ['colors', 'shapes', 'puzzle']) {
    await page.goto(`/#/games/${game}`);
    let source;
    let destination;
    if (game === 'colors') {
      const target = await cue(page, game);
      source = page.locator('.cs-fruit');
      destination = page.locator(`[data-drop-color="${target}"]`);
    } else if (game === 'shapes') {
      const target = await cue(page, game);
      source = page.locator('.sg-piece');
      destination = page.locator(`[data-drop-shape="${target}"]`);
    } else {
      source = page.locator('[data-piece="0"]');
      destination = page.locator('[data-slot="0"]');
    }
    const from = await source.boundingBox();
    const to = await destination.boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator('#mini-answer-feedback')).toHaveAttribute('data-kind', 'correct');
    await expect(earned(page)).toHaveCount(1);
  }
});

for (const interruption of ['settings', 'portrait']) {
  test(`completion still celebrates after the final answer is interrupted by ${interruption}`, async ({ page }) => {
    await page.locator('#open-puzzle').click();
    for (let piece = 0; piece < 3; piece++) {
      await answer(page, 'puzzle', true, piece);
      await expect(earned(page)).toHaveCount(piece + 1);
      if (piece < 2) await expect(page.locator('#mini-answer-feedback')).not.toBeVisible();
    }
    if (interruption === 'settings') {
      await page.locator('#mini-settings').click();
      await expect(page.locator('#settings-dialog')).toBeVisible();
    } else {
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator('#mini-orientation-notice')).toBeVisible();
    }
    await page.waitForTimeout(2100);
    await expect(page.locator('#mini-finish')).not.toBeVisible();
    if (interruption === 'settings') await page.locator('[data-close="settings-dialog"]').click();
    else await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#mini-finish')).toBeVisible();
    await expect(earned(page)).toHaveCount(3);
    await page.locator('#mini-play-again').click();
    await expect(earned(page)).toHaveCount(0);
  });
}

test('all new games fit short landscape phones with accessible targets and fully loaded art', async ({ page }) => {
  for (const viewport of [{ width: 667, height: 375 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const game of games) {
      await page.goto(`/#/games/${game}`);
      await expect(page.locator('#mini-help')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
      await expect.poll(() => page.locator('#mini-content img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
      const controlsTop = (await page.locator('#mini-help').boundingBox()).y;
      for (const button of await page.locator('#mini-content button').all()) {
        const bounds = await button.boundingBox();
        expect(bounds.width, `${game} target width`).toBeGreaterThanOrEqual(44);
        expect(bounds.height, `${game} target height`).toBeGreaterThanOrEqual(44);
        expect(bounds.x, `${game} left edge`).toBeGreaterThanOrEqual(0);
        expect(bounds.y, `${game} top edge`).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width, `${game} right edge`).toBeLessThanOrEqual(viewport.width + 1);
        expect(bounds.y + bounds.height, `${game} bottom edge`).toBeLessThanOrEqual(controlsTop + 2);
      }
      if (viewport.width === 844) await page.screenshot({ path: `/tmp/kids-${game}-landscape.png`, fullPage: true });
      await answer(page, game, false);
      await expectFullFrame(page, 'wrong');
    }
  }
});
