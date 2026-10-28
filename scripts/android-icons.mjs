import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Deterministic density exports of this project's original, reviewed flower artwork.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const branding = resolve(root, 'store/branding/png');
const res = resolve(root, 'android/app/src/main/res');
const foreground = (await readFile(resolve(branding, 'adaptive-foreground-432.png'))).toString('base64');
const legacy = (await readFile(resolve(branding, 'play-icon-512.png'))).toString('base64');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  for (const [density, factor] of [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]]) {
    const directory = resolve(res, `mipmap-${density}`);
    await mkdir(directory, { recursive: true });
    for (const [name, baseSize, source] of [
      ['ic_launcher_foreground', 108, foreground],
      ['ic_launcher', 48, legacy],
      ['ic_launcher_round', 48, legacy],
    ]) {
      const png = await page.evaluate(async ({ source, size }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${source}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d');
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, size, size);
        return canvas.toDataURL('image/png').split(',')[1];
      }, { source, size: Math.round(baseSize * factor) });
      await writeFile(resolve(directory, `${name}.png`), Buffer.from(png, 'base64'));
    }
  }
} finally {
  await browser.close();
}
console.log('Android flower launcher icons exported for five densities.');
