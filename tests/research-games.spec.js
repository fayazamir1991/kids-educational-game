import { test, expect } from '@playwright/test';

const actions = {
  run: /می.?دو(?:د|ه)/,
  eat: /می.?خور(?:د|ه)/,
  sleep: /خواب|خوابید/,
  water: /آب/,
  paint: /نقاشی|رنگ/,
};
const selectedGames = ['picture', 'lunch', 'shapes'];
const earned = (page) => page.locator('#mini-progress .earned');
const response = (page) => page.locator('#mini-answer-feedback');
const pageErrors = new WeakMap();

async function open(page, id) {
  await page.goto(`/#/games/${id}`);
  await expect(page.locator('#mini-game-screen')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function fullFrame(page, kind) {
  await expect(response(page)).toHaveAttribute('data-kind', kind);
  const bounds = await response(page).boundingBox();
  expect(bounds.x).toBeCloseTo(0, 0);
  expect(bounds.y).toBeCloseTo(0, 0);
  expect(bounds.width).toBeCloseTo(page.viewportSize().width, 0);
  expect(bounds.height).toBeCloseTo(page.viewportSize().height, 0);
  await expect(response(page).locator('.feedback-emblem')).toBeVisible();
  if (kind === 'correct') await expect(response(page)).toHaveAttribute('data-effect', /^(confetti|balloons|stars)$/);
  else {
    await expect(response(page)).toHaveAttribute('data-effect', 'retry');
    const color = await response(page).locator('.feedback-border').evaluate((element) => getComputedStyle(element).borderTopColor.match(/[\d.]+/g).map(Number));
    expect(color[0]).toBeGreaterThan(color[1] + 60);
  }
}

async function answer(page, id) {
  if (id === 'picture') {
    const action = await page.locator('.picture-cue').getAttribute('data-action');
    await page.locator(`[data-picture-action="${action}"]`).click();
  } else if (id === 'lunch') {
    await page.locator('[data-lunch-fruit][data-delivered="false"]').first().click();
    await page.locator('[data-lunch-friend][data-fed="false"]').first().click();
  } else {
    const shape = await page.locator('.sg-piece').getAttribute('data-shape');
    await page.locator(`[data-drop-shape="${shape}"]`).click();
  }
}

async function drag(page, source, destination) {
  const from = await source.boundingBox();
  const to = await destination.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Math.random = () => 0.25;
    localStorage.setItem('little-farm-settings', JSON.stringify({ narration: false }));
    window.__researchAudioStarts = 0;
    const nativeStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const value = nativeStart.apply(this, args);
      window.__researchAudioStarts++;
      return value;
    };
  });
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('picture detective asks five distinct action questions with visible matching props and retains a wrong challenge', async ({ page }) => {
  await open(page, 'picture');
  // Reading and installed Persian speech are not required to use the visual cue.
  await page.addStyleTag({ content: '#mini-message,.picture-actor-label{visibility:hidden!important}' });
  const seen = new Set();
  for (let round = 0; round < 5; round++) {
    const action = await page.locator('.picture-cue').getAttribute('data-action');
    expect(Object.keys(actions)).toContain(action);
    seen.add(action);
    await expect(page.locator('#mini-message')).toContainText(actions[action]);
    await expect(page.locator('[data-picture-action]')).toHaveCount(3);
    expect(await page.locator('[data-picture-action]').evaluateAll((elements) => new Set(elements.map((element) => element.dataset.pictureAction)).size)).toBe(3);
    await expect(page.locator(`.picture-cue [data-action-prop="${action}"]`)).toBeVisible();
    await expect(page.locator(`.picture-actor[data-picture-action="${action}"] [data-action-prop="${action}"]`)).toBeVisible();
    expect(await page.locator('.picture-cue [data-character]').count()).toBe(0);
    const illustrations = await page.locator('.picture-actor-art svg').evaluateAll((svgs) => svgs.map((svg) => [...svg.querySelectorAll('path,circle,ellipse,rect,polygon')].map((shape) => shape.outerHTML).join('')));
    expect(illustrations.every((illustration) => illustration.length > 100)).toBe(true);
    expect(new Set(illustrations).size).toBe(3);
    if (round === 0) {
      const order = await page.locator('[data-picture-action]').evaluateAll((elements) => elements.map((element) => `${element.dataset.character}:${element.dataset.pictureAction}`));
      await page.locator(`[data-picture-action]:not([data-picture-action="${action}"])`).first().click();
      await fullFrame(page, 'wrong');
      await expect(earned(page)).toHaveCount(0);
      await expect(response(page)).not.toBeVisible();
      expect(await page.locator('.picture-cue').getAttribute('data-action')).toBe(action);
      expect(await page.locator('[data-picture-action]').evaluateAll((elements) => elements.map((element) => `${element.dataset.character}:${element.dataset.pictureAction}`))).toEqual(order);
    }
    await answer(page, 'picture');
    await fullFrame(page, 'correct');
    await page.locator('#mini-content').evaluate((mount) => {
      for (const button of mount.querySelectorAll('button')) for (let tap = 0; tap < 3; tap++) button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(earned(page)).toHaveCount(round + 1);
    await expect(response(page)).not.toBeVisible();
  }
  expect([...seen].sort()).toEqual(Object.keys(actions).sort());
  await expect(page.locator('#mini-finish')).toBeVisible();
  await page.locator('#mini-play-again').click();
  await expect(earned(page)).toHaveCount(0);
  await expect(page.locator('[data-picture-action]')).toHaveCount(3);
  expect(await page.evaluate(() => window.__researchAudioStarts)).toBe(0);
});

test('three friends receive exactly one fruit each; duplicate feeding keeps the inventory and placed food', async ({ page }) => {
  await open(page, 'lunch');
  await expect(page.locator('[data-lunch-friend]')).toHaveCount(3);
  await expect(page.locator('[data-lunch-fruit]')).toHaveCount(3);
  await page.locator('[data-lunch-friend]').first().click();
  await expect(earned(page)).toHaveCount(0);
  await expect(page.locator('[data-lunch-friend][data-fed="true"]')).toHaveCount(0);
  await answer(page, 'lunch');
  await fullFrame(page, 'correct');
  await expect(page.locator('[data-lunch-friend][data-fed="true"]')).toHaveCount(1);
  await expect(page.locator('[data-lunch-fruit][data-delivered="true"]')).toHaveCount(1);
  await page.locator('#mini-content').evaluate((mount) => {
    for (const button of mount.querySelectorAll('[data-lunch-friend]')) button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await expect(earned(page)).toHaveCount(1);
  await expect(response(page)).not.toBeVisible();
  await expect(page.locator('.lunch-served-fruit > svg')).toHaveCount(1);
  const selected = page.locator('[data-lunch-fruit][data-delivered="false"]').first();
  await selected.click();
  await page.locator('[data-lunch-friend][data-fed="true"]').click();
  await fullFrame(page, 'wrong');
  await expect(earned(page)).toHaveCount(1);
  await expect(page.locator('[data-lunch-fruit][data-delivered="true"]')).toHaveCount(1);
  await expect(page.locator('.lunch-served-fruit > svg')).toHaveCount(1);
  await expect(response(page)).not.toBeVisible();
  await expect(page.locator('[data-lunch-fruit][data-delivered="false"]')).toHaveCount(2);
  for (let total = 2; total <= 3; total++) {
    await answer(page, 'lunch');
    await expect(earned(page)).toHaveCount(total);
    await expect(page.locator('[data-lunch-friend][data-fed="true"]')).toHaveCount(total);
    await expect(page.locator('.lunch-served-fruit > svg')).toHaveCount(total);
    await expect(response(page)).not.toBeVisible();
  }
  await expect(page.locator('#mini-finish')).toBeVisible();
  await expect(page.locator('[data-lunch-fruit][data-delivered="true"]')).toHaveCount(3);
  await page.locator('#mini-play-again').click();
  await expect(earned(page)).toHaveCount(0);
  await expect(page.locator('[data-lunch-friend][data-fed="true"]')).toHaveCount(0);
  await expect(page.locator('[data-lunch-fruit][data-delivered="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__researchAudioStarts)).toBe(0);
});

test('picture action props remain usable with no narration, text or animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, 'picture');
  await page.addStyleTag({ content: '#mini-message{visibility:hidden!important}' });
  const action = await page.locator('.picture-cue').getAttribute('data-action');
  const cue = page.locator(`.picture-cue [data-action-prop="${action}"]`);
  await expect(cue).toBeVisible();
  expect(await cue.locator('path,circle,ellipse,rect').count()).toBeGreaterThan(2);
  expect(await page.locator('.picture-game').evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length)).toBe(0);
  await answer(page, 'picture');
  await fullFrame(page, 'correct');
  await expect(earned(page)).toHaveCount(1);
  await expect(response(page).locator('.feedback-particle')).toHaveCount(0);
});

test('lunch supports pointer dragging into an empty plate', async ({ page }) => {
  await open(page, 'lunch');
  await drag(page, page.locator('[data-lunch-fruit]').last(), page.locator('[data-lunch-friend]').last());
  await fullFrame(page, 'correct');
  await expect(earned(page)).toHaveCount(1);
  await expect(page.locator('[data-lunch-fruit][data-delivered="true"]')).toHaveCount(1);
  await expect(page.locator('[data-lunch-friend][data-fed="true"]')).toHaveCount(1);
});

test('shape matching uses geometry rather than color and handles rotated pieces across a full session', async ({ page }) => {
  await open(page, 'shapes');
  const orientations = new Set();
  const shapes = new Set();
  for (let round = 0; round < 5; round++) {
    const target = await page.locator('.sg-piece').getAttribute('data-shape');
    shapes.add(target);
    const angle = Number(await page.locator('.sg-piece').getAttribute('data-rotation'));
    orientations.add(angle);
    await expect(page.locator('.sg-piece .sg-geometry')).toHaveAttribute('transform', `rotate(${angle} 65 65)`);
    const emptyFills = await page.locator('.sg-slot .sg-geometry').evaluateAll((groups) => groups.map((group) => getComputedStyle(group.querySelector('circle,rect,path')).fill));
    expect(new Set(emptyFills).size).toBe(1);
    const piecePalette = await page.locator('.sg-piece svg stop').evaluateAll((stops) => stops.map((stop) => getComputedStyle(stop).stopColor));
    expect(piecePalette.length).toBeGreaterThan(0);
    const slotPalettes = await page.locator('.sg-slot svg').evaluateAll((svgs) => svgs.map((svg) => [...svg.querySelectorAll('stop')].map((stop) => getComputedStyle(stop).stopColor)));
    for (const palette of slotPalettes) expect(palette).toEqual(piecePalette);
    const geometry = await page.locator('.sg-slot .sg-geometry').evaluateAll((groups) => groups.map((group) => group.querySelector('circle,rect,path').outerHTML));
    expect(new Set(geometry).size).toBe(3);
    await answer(page, 'shapes');
    await expect(earned(page)).toHaveCount(round + 1);
    await expect(page.locator(`[data-drop-shape="${target}"] .sg-geometry`)).toHaveAttribute('transform', 'rotate(0 65 65)');
    await expect(response(page)).not.toBeVisible();
  }
  expect(shapes.size).toBe(3);
  expect(orientations.size).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#mini-finish')).toBeVisible();
});

test('the catalog contains eight playable entries with one shapes entry and reliable new deep links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-open-game]')).toHaveCount(8);
  await expect(page.locator('[data-open-game="shapes"]')).toHaveCount(1);
  for (const id of selectedGames) {
    await page.locator(`#open-${id}`).click();
    await expect(page).toHaveURL(new RegExp(`#/games/${id}$`));
    await expect(page.locator('#mini-game-screen')).toBeVisible();
    await page.reload();
    await expect(page.locator('#mini-game-screen')).toBeVisible();
    await expect(earned(page)).toHaveCount(0);
    await page.locator('#mini-back').click();
    await expect(page.locator('#home-screen')).toBeVisible();
  }
});

test('new games clean up full-screen feedback on leaving, mute, rotation and restart', async ({ page }) => {
  for (const id of ['picture', 'lunch']) {
    await open(page, id);
    if (await page.locator('#mini-sound').getAttribute('aria-pressed') === 'true') await page.locator('#mini-sound').click();
    await answer(page, id);
    await expect(earned(page)).toHaveCount(1);
    await page.locator('#mini-back').click();
    await expect(page.locator('#home-screen')).toBeVisible();
    await expect(response(page)).not.toBeVisible();
    await expect(response(page).locator('.feedback-particle')).toHaveCount(0);
    await page.waitForTimeout(2100);
    await open(page, id);
    await expect(earned(page)).toHaveCount(0);
    await answer(page, id);
    await page.locator('#mini-sound').click();
    await expect(page.locator('#mini-sound')).toHaveAttribute('aria-pressed', 'true');
    await expect(response(page)).not.toBeVisible();
    await page.locator('#mini-restart').click();
    await expect(earned(page)).toHaveCount(0);
    await page.waitForTimeout(2100);
    await expect(earned(page)).toHaveCount(0);
    await answer(page, id);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#mini-orientation-notice')).toBeVisible();
    await expect(response(page)).not.toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    await page.locator('#mini-settings').click();
    await page.locator('#restart-button').click();
    await expect(earned(page)).toHaveCount(0);
  }
});

test('selected games fit small landscape phones with loaded art and reachable controls', async ({ page }) => {
  for (const viewport of [{ width: 667, height: 375 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const id of selectedGames) {
      await open(page, id);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
      await expect.poll(() => page.locator('#mini-content img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
      const footerTop = (await page.locator('#mini-help').boundingBox()).y;
      for (const button of await page.locator('#mini-content button').all()) {
        const bounds = await button.boundingBox();
        expect(bounds.width, `${id} width`).toBeGreaterThanOrEqual(44);
        expect(bounds.height, `${id} height`).toBeGreaterThanOrEqual(44);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(footerTop + 2);
        const hittable = await button.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
        });
        expect(hittable, `${id} control center is reachable`).toBe(true);
      }
      await page.screenshot({ path: `/tmp/research-${id}-${viewport.width}.png`, fullPage: true });
    }
  }
});

test('opening a game focuses its title instead of visually suggesting the first answer', async ({ page }) => {
  for (const id of selectedGames) {
    await open(page, id);
    await expect(page.locator('#mini-title')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('#mini-title')).toBeFocused();
    await expect(page.locator('#mini-content button:focus-visible')).toHaveCount(0);
    await expect(earned(page)).toHaveCount(0);
    await answer(page, id);
    await expect(earned(page)).toHaveCount(1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, 'picture');
  await expect(page.locator('#mini-orientation-notice')).toBeVisible();
  await expect(page.locator('#mini-orientation-title')).toBeFocused();
  await expect(page.locator('#mini-content button:focus-visible')).toHaveCount(0);
});
