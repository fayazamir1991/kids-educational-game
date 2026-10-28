// Original vector artwork. Rebuild with: node store/branding/render-assets.mjs
// Uses the project's existing Playwright and Vazirmatn dependencies; no network.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../..');
const font = await readFile(path.join(repository, 'node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-800-normal.woff2'));
const fontRegular = await readFile(path.join(repository, 'node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-500-normal.woff2'));
const palette = { cream: '#FFF9EB', ink: '#423B55', lavender: '#A78DC5', coral: '#EFAB99', green: '#83AD99', gold: '#F2D17A' };

// The complete mark fits inside Android's central 66/108 adaptive safe circle.
const flower = () => `
  <g stroke-linecap="round" stroke-linejoin="round">
    <path d="M54 54 C52 65 53 74 54 80" fill="none" stroke="${palette.green}" stroke-width="5"/>
    <path d="M52 73 C40 75 35 68 36 63 C47 62 52 66 52 73Z" fill="${palette.green}"/>
    <path d="M54 78 C65 78 71 72 70 67 C60 66 55 70 54 78Z" fill="#A9C9A3"/>
    <ellipse cx="54" cy="35" rx="10" ry="13" fill="${palette.coral}"/>
    <ellipse cx="54" cy="35" rx="10" ry="13" transform="rotate(72 54 48)" fill="${palette.lavender}"/>
    <ellipse cx="54" cy="35" rx="10" ry="13" transform="rotate(144 54 48)" fill="${palette.coral}"/>
    <ellipse cx="54" cy="35" rx="10" ry="13" transform="rotate(216 54 48)" fill="${palette.lavender}"/>
    <ellipse cx="54" cy="35" rx="10" ry="13" transform="rotate(288 54 48)" fill="${palette.lavender}"/>
    <circle cx="54" cy="48" r="12.5" fill="${palette.gold}"/>
    <circle cx="49.8" cy="46.9" r="1.35" fill="${palette.ink}"/>
    <circle cx="58.2" cy="46.9" r="1.35" fill="${palette.ink}"/>
    <path d="M50 51 Q54 54.8 58 51" fill="none" stroke="${palette.ink}" stroke-width="1.7"/>
    <ellipse cx="46.4" cy="50.2" rx="2" ry="1.1" fill="#ECA48C"/>
    <ellipse cx="61.6" cy="50.2" rx="2" ry="1.1" fill="#ECA48C"/>
  </g>`;

const svg = (width, height, body, description) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${description}">
<title>${description}</title>
${body}
</svg>\n`;
const fontStyle = `<style>
@font-face { font-family: 'VazirmatnBrand'; font-style: normal; font-weight: 800; src: url(data:font/woff2;base64,${font.toString('base64')}) format('woff2'); }
@font-face { font-family: 'VazirmatnBrand'; font-style: normal; font-weight: 500; src: url(data:font/woff2;base64,${fontRegular.toString('base64')}) format('woff2'); }
text { font-family: 'VazirmatnBrand', sans-serif; fill: ${palette.ink}; }
</style>`;

const star = (x, y, scale = 1, color = palette.gold) => `<path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3Z" transform="translate(${x} ${y}) scale(${scale})" fill="${color}"/>`;
const feature = (locale) => {
  const persian = locale === 'fa';
  const title = persian ? 'باغ بازی‌های کوچولو' : 'Little Play Garden';
  const line = persian ? '۸ بازی فارسی برای کودکان ۳ تا ۵ سال' : '8 Persian games for ages 3–5';
  const detail = persian ? 'آفلاین  •  بدون تبلیغ' : 'Offline  •  No ads';
  const invitation = persian ? 'با هم بازی کنیم و کشف کنیم!' : 'Play, explore and try together!';
  return svg(1024, 500, `${fontStyle}
    <rect width="1024" height="500" fill="${palette.cream}"/>
    <ellipse cx="60" cy="0" rx="204" ry="109" fill="#EDE4F4"/>
    <ellipse cx="1018" cy="508" rx="219" ry="108" fill="#E3EDD7"/>
    <circle cx="213" cy="248" r="158" fill="#E9F0DF"/>
    <circle cx="213" cy="248" r="131" fill="#F5F4DE"/>
    <g transform="translate(-3 38) scale(4)">${flower()}</g>
    <g transform="translate(54 335) rotate(-12)">
      <rect width="79" height="79" rx="23" fill="white"/>
      <circle cx="39.5" cy="39.5" r="23" fill="${palette.coral}"/>
    </g>
    <g transform="translate(300 331) rotate(10)">
      <rect width="79" height="79" rx="23" fill="white"/>
      <path d="M40 16 L65 60 L15 60Z" fill="${palette.lavender}" stroke="${palette.lavender}" stroke-width="5" stroke-linejoin="round"/>
    </g>
    ${star(72, 160, 1.3)}${star(339, 133, 1.2, palette.coral)}${star(378, 250, .8)}
    <text x="954" y="187" text-anchor="${persian ? 'start' : 'end'}" font-size="${persian ? 51 : 43}" font-weight="800"${persian ? ' direction="rtl"' : ''}>${title}</text>
    <text x="954" y="249" text-anchor="${persian ? 'start' : 'end'}" font-size="${persian ? 27 : 28}" font-weight="500"${persian ? ' direction="rtl"' : ''}>${line}</text>
    <rect x="${persian ? 673 : 676}" y="279" width="278" height="51" rx="25.5" fill="#E9E0F0"/>
    <text x="812" y="313" text-anchor="middle" font-size="23" font-weight="800"${persian ? ' direction="rtl"' : ''}>${detail}</text>
    <text x="954" y="384" text-anchor="${persian ? 'start' : 'end'}" font-size="25" font-weight="500"${persian ? ' direction="rtl"' : ''}>${invitation}</text>
  `, `${title} — original promotional artwork; not a gameplay screenshot`);
};

const artwork = [
  { name: 'adaptive-foreground', width: 432, height: 432, transparent: true,
    master: svg(108, 108, flower(), 'Little Play Garden smiling flower foreground') },
  { name: 'adaptive-background', width: 432, height: 432,
    master: svg(108, 108, `<rect width="108" height="108" fill="${palette.cream}"/>`, 'Little Play Garden cream adaptive background') },
  { name: 'play-icon', width: 512, height: 512,
    master: svg(108, 108, `<rect width="108" height="108" fill="${palette.cream}"/><g transform="translate(-10.8 -10.8) scale(1.2)">${flower()}</g>`, 'Little Play Garden app icon') },
  { name: 'feature-graphic-fa', width: 1024, height: 500, master: feature('fa') },
  { name: 'feature-graphic-en', width: 1024, height: 500, master: feature('en') },
];
await mkdir(path.join(directory, 'master'), { recursive: true });
await mkdir(path.join(directory, 'png'), { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  for (const item of artwork) {
    await writeFile(path.join(directory, 'master', `${item.name}.svg`), item.master);
    const page = await browser.newPage({ viewport: { width: item.width, height: item.height }, deviceScaleFactor: 1 });
    await page.setContent(`<html><head><style>html,body { margin:0; width:100%; height:100%; overflow:hidden; background:transparent; } svg { width:100%; height:100%; display:block; }</style></head><body>${item.master}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const filename = `${item.name}-${item.width}${item.width === item.height ? '' : `x${item.height}`}.png`;
    await page.screenshot({ path: path.join(directory, 'png', filename), omitBackground: item.transparent || false });
    console.log(filename);
    await page.close();
  }
} finally {
  await browser.close();
}
