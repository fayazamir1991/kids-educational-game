import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { ANIMALS, PLAYABLE_ANIMALS, createRounds } from '../src/game.js';

const artifact = resolve(process.argv[2] || 'dist/little-farm.html');
const outputDirectory = resolve(process.env.PREVIEW_DIRECTORY || 'test-results/standalone');
// Managed Chromium blocks file:// in this cloud machine. Exact HTML bytes can
// still be tested as a self-contained document with the browser network offline.
const directFileNavigation = process.env.STANDALONE_FILE_NAVIGATION === '1';
await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});

function instrumentAudio() {
  Math.random = () => 0.25;
  window.__audioStarts = [];
  window.__audioFetches = [];
  const nativeFetch = window.fetch;
  window.fetch = function (...args) {
    const url = String(args[0]);
    if (/\/audio\/.*\.mp3(?:$|\?)/.test(url) || url.startsWith('data:audio/')) window.__audioFetches.push(url);
    return nativeFetch.apply(this, args);
  };
  const nativeStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    const result = nativeStart.apply(this, args);
    window.__audioStarts.push({ duration: this.buffer?.duration, frames: this.buffer?.length });
    return result;
  };
}

try {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, offline: true });
  if (directFileNavigation) await context.addInitScript(instrumentAudio);
  const page = await context.newPage();
  const errors = [];
  const failures = [];
  const networkRequests = [];
  const extraFiles = [];
  const artifactUrl = pathToFileURL(artifact).href;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => failures.push(request.url()));
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) networkRequests.push(request.url());
    if (request.url().startsWith('file:') && request.url() !== artifactUrl) extraFiles.push(request.url());
  });
  if (directFileNavigation) await page.goto(artifactUrl);
  else {
    await page.evaluate(instrumentAudio);
    await page.setContent(await readFile(artifact, 'utf8'));
  }
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#home-screen')).toBeVisible();
  await expect(page.locator('#orientation-notice')).not.toBeVisible();
  assert.equal(await page.evaluate(() => window.__audioStarts.length), 0, 'Opening the collection must not play audio');
  await page.screenshot({ path: `${outputDirectory}/little-farm-home.png`, fullPage: true });
  await page.locator('#open-animal-sounds').click();
  const initialUrl = page.url();
  await expect(page.locator('#listen-button')).toBeVisible();
  await expect(page.locator('[data-animal]')).toHaveCount(3);
  await expect.poll(() => page.locator('.animal img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0 && image.src.startsWith('data:')))).toBe(true);
  assert.match(await page.locator('#game-screen .game-canvas').evaluate((element) => getComputedStyle(element).backgroundImage), /data:image\//, 'The landscape background must be embedded');
  assert.equal(await page.evaluate(() => [...document.fonts].some((font) => font.family.includes('Vazirmatn') && font.status === 'loaded')), true, 'Persian font must load offline');

  const recordings = await page.evaluate(async (ids) => {
    const context = new OfflineAudioContext(1, 1, 44100);
    const facts = [];
    for (const id of ids) {
      const image = globalThis.__LITTLE_FARM_ASSETS__?.[`/art/${id}.svg`];
      const url = globalThis.__LITTLE_FARM_ASSETS__?.[`/audio/${id}.mp3`];
      if (!url?.startsWith('data:audio/') || !image?.startsWith('data:image/')) throw new Error(`Missing embedded assets for ${id}`);
      const response = await fetch(url);
      const audio = await context.decodeAudioData(await response.arrayBuffer());
      let peak = 0;
      let sum = 0;
      for (const value of audio.getChannelData(0)) { peak = Math.max(peak, Math.abs(value)); sum += value * value; }
      facts.push({ id, duration: audio.duration, frames: audio.length, peak, rms: Math.sqrt(sum / audio.length) });
    }
    return facts;
  }, ANIMALS.map(({ id }) => id));
  assert.equal(recordings.length, ANIMALS.length);
  for (const recording of recordings) {
    assert.ok(recording.duration > 0.5 && recording.duration < 15, `${recording.id}: playable short recording`);
    assert.ok(recording.peak <= 1.001 && recording.rms > 0.0001, `${recording.id}: non-silent, non-clipping audio`);
  }
  await page.screenshot({ path: `${outputDirectory}/little-farm-preview.png`, fullPage: true });

  const rounds = createRounds(() => 0.25);
  await page.locator('#listen-button').click();
  let expectedPlaybackCount = 1;
  for (const [index, round] of rounds.entries()) {
    await expect.poll(() => page.locator('[data-animal]').evaluateAll((buttons) => buttons.map((button) => button.dataset.animal).sort())).toEqual([...round.choices].sort());
    await expect.poll(() => page.evaluate(() => window.__audioStarts.length)).toBe(expectedPlaybackCount);
    const played = await page.evaluate(() => window.__audioStarts.at(-1));
    assert.ok(played.duration > 0.5 && played.frames > 1000, 'A real decoded recording must start');
    if (index === 0) {
      await page.locator(`[data-animal="${round.choices.find((id) => id !== round.target)}"]`).click();
      await expect(page.locator('#message-text')).toContainText(/اشکالی|دوباره/);
      await expect(page.locator('#answer-feedback')).toHaveAttribute('data-kind', 'wrong');
      await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => window.__audioStarts.length)).toBe(++expectedPlaybackCount);
      await expect.poll(() => page.locator('[data-animal]').evaluateAll((buttons) => buttons.map((button) => button.dataset.animal).sort())).toEqual([...round.choices].sort());
    }
    await page.locator(`[data-animal="${round.target}"]`).click();
    await expect(page.locator('.progress-flower.earned')).toHaveCount(index + 1);
    await expect(page.locator('#answer-feedback')).toHaveAttribute('data-kind', 'correct');
    if (index < rounds.length - 1) expectedPlaybackCount++;
  }
  await expect(page.locator('#celebration-dialog')).toBeVisible();
  await page.locator('#play-again').click();
  await expect(page.locator('#celebration-dialog')).not.toBeVisible();
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__audioStarts.length)).toBe(++expectedPlaybackCount);

  await page.locator('#settings-button').click();
  await page.locator('#restart-button').click();
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
  assert.equal(page.url(), initialUrl, 'Restart must stay in the standalone document');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1), true);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outputDirectory}/little-farm-mobile.png`, fullPage: true });
  await page.locator('#settings-button').click();
  await page.locator('.review-details summary').click();
  await expect(page.locator('#withheld-list li')).toHaveCount(ANIMALS.length - PLAYABLE_ANIMALS.length);
  await page.locator('#credits-button').click();
  await expect(page.locator('[data-audition]')).toHaveCount(ANIMALS.length);
  for (const [index, id] of ['lion', 'crow'].entries()) {
    await page.locator(`[data-audition="${id}"]`).click();
    await expect(page.locator(`[data-audition="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => window.__audioStarts.length)).toBe(++expectedPlaybackCount);
    assert.equal(await page.evaluate((animalId) => window.__audioFetches.includes(globalThis.__LITTLE_FARM_ASSETS__[`/audio/${animalId}.mp3`]), id), true);
    await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
  }
  await page.locator('[data-close="credits-dialog"]').click();
  await expect(page.locator('#listen-button')).not.toHaveClass(/is-playing/);
  await page.locator('#back-to-games').click();
  await expect(page.locator('#home-screen')).toBeVisible();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.locator('#open-animal-sounds').click();
  await expect(page.locator('.progress-flower.earned')).toHaveCount(0);
  await expect(page.locator('#round-label')).toContainText('آماده‌ای');
  assert.equal(await page.evaluate(() => window.__audioStarts.length), expectedPlaybackCount, 'Returning to a game must wait for a fresh tap');
  await page.locator('#back-to-games').click();
  await expect(page.locator('[data-open-game]')).toHaveCount(6);
  const miniGamesCompleted = [];
  for (const id of ['colors', 'shapes', 'counting', 'puzzle', 'sizes']) {
    await page.locator(`#open-${id}`).click();
    await expect(page.locator('#mini-game-screen')).toBeVisible();
    await expect(page.locator('#mini-progress .earned')).toHaveCount(0);
    if (id === 'colors') {
      const color = await page.locator('.cs-fruit').getAttribute('data-color');
      await page.locator(`[data-drop-color="${color}"]`).click();
    } else if (id === 'shapes') {
      const shape = await page.locator('.sg-piece').getAttribute('data-shape');
      await page.locator(`[data-drop-shape="${shape}"]`).click();
    } else if (id === 'counting') {
      const count = await page.locator('.count-goal-carrots > svg').count();
      for (let index = 0; index < count; index++) await page.locator(`[data-carrot="${index}"]`).click();
      await page.locator('[data-action="feed"]').click();
    } else if (id === 'puzzle') {
      assert.match(await page.locator('.puzzle-guide').getAttribute('src'), /^data:image\//, 'The puzzle animal must be embedded');
      assert.equal(await page.locator('.puzzle-fragment-image').evaluateAll((images) => images.every((image) => image.getAttribute('href').startsWith('data:image/'))), true, 'All puzzle fragments must use embedded art');
      await page.locator('[data-piece="0"]').click();
      await page.locator('[data-slot="0"]').click();
      await expect(page.locator('.puzzle-slot[data-placed="true"]')).toHaveCount(1);
    } else {
      const size = await page.locator('.sizes-reference.is-requested').getAttribute('data-reference-size');
      await expect.poll(() => page.locator('.sizes-game img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0 && image.src.startsWith('data:image/')))).toBe(true);
      await page.locator(`[data-size="${size}"]`).click();
    }
    await expect(page.locator('#mini-answer-feedback')).toHaveAttribute('data-kind', 'correct');
    await expect(page.locator('#mini-progress .earned')).toHaveCount(1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1), true, `${id} must fit mobile landscape`);
    await page.screenshot({ path: `${outputDirectory}/kids-${id}.png`, fullPage: true });
    miniGamesCompleted.push(id);
    await page.locator('#mini-back').click();
    await expect(page.locator('#home-screen')).toBeVisible();
    await expect(page.locator('#mini-answer-feedback')).not.toBeVisible();
  }
  assert.equal(await page.evaluate(() => window.__audioStarts.length), expectedPlaybackCount, 'Visual games must never play an animal recording');
  assert.deepEqual(errors, [], 'No browser exceptions');
  assert.deepEqual(failures, [], 'No failed asset requests');
  assert.deepEqual(networkRequests, [], 'No network dependencies');
  assert.deepEqual(extraFiles, [], 'No external local files');
  assert.equal(await page.evaluate(() => window.__audioFetches.every((url) => url.startsWith('data:audio/'))), true);
  console.log(JSON.stringify({
    passed: true, artifact,
    documentDelivery: directFileNavigation ? 'file navigation' : 'offline page.setContent using exact HTML bytes',
    directFileNavigationValidated: directFileNavigation,
    recordingsDecoded: recordings.length,
    playableAnimals: PLAYABLE_ANIMALS.length,
    withheldAnimals: ANIMALS.length - PLAYABLE_ANIMALS.length,
    roundsCompleted: rounds.length,
    miniGamesWithCorrectAnswers: miniGamesCompleted,
    realAudioPlays: await page.evaluate(() => window.__audioStarts.length),
    errors, failures, networkRequests, extraFiles,
    screenshots: [`${outputDirectory}/little-farm-home.png`, `${outputDirectory}/little-farm-preview.png`, `${outputDirectory}/little-farm-mobile.png`],
  }, null, 2));
} finally { await browser.close(); }
