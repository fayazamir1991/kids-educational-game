import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'store/screenshots/bazaar-portrait');
const data = async (name, mime) => `data:${mime};base64,${(await readFile(path.join(root, name))).toString('base64')}`;
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const bgPath = 'store/screenshots/portrait-art/garden-background.png';
const logoPath = 'store/branding/png/play-icon-512.png';
const background = await data(bgPath, 'image/png');
const logo = await data(logoPath, 'image/png');
const fonts = await Promise.all([500, 700, 900].map(async (weight) => `@font-face{font-family:Vazir; font-weight:${weight};src:url(${await data(`node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-${weight}-normal.woff2`, 'font/woff2')})}`));
const scenes = [
  ['01-catalog', 'فهرست بازی‌ها', 'امروز چی بازی کنیم؟', '۸ بازی فارسی برای کوچولوهای کنجکاو', ['بازی‌های متنوع', 'کشف و یادگیری'], '#9679B0'],
  ['02-animal-sounds', 'بازی شنیداری', 'کی صدا کرد؟', 'صدا رو بشنو، دوستت رو پیدا کن!', ['شناخت حیوانات', 'گوش‌دادن'], '#9679B0'],
  ['03-picture-detective', 'زبان و توجه', 'کارآگاه تصویر', 'دوستت چه کار می‌کنه؟ خوب نگاه کن!', ['دقت دیداری', 'شناخت کارها'], '#759EAA'],
  ['04-color-baskets', 'شناخت رنگ‌ها', 'سبدهای رنگی', 'هر میوه، توی سبد هم‌رنگ خودش!', ['شناخت رنگ', 'دسته‌بندی'], '#C98779'],
  ['05-shape-house', 'شناخت شکل‌ها', 'خانهٔ شکل‌ها', 'هر شکل، یک جای مخصوص داره!', ['تطبیق شکل', 'جهت‌های متفاوت'], '#7BA191'],
  ['06-friends-lunch', 'یکی برای هر دوست', 'ناهار سه دوست', 'به هر دوست یک میوه بده؛ کسی جا نمونه!', ['تناظر یک‌به‌یک', 'مقدارهای کم'], '#B99272'],
  ['07-feed-the-rabbit', 'شمارش کوچولو', 'به خرگوش غذا بده', 'هویج‌ها رو بشمار و به خرگوش بده!', ['شمارش ۱ تا ۳', 'انتخاب و تحویل'], '#BF9D60'],
  ['08-little-puzzle', 'کشف تصویر', 'پازل کوچولو', 'تکه‌ها رو کنار هم بذار، تصویر بساز!', ['حل مسئله', 'جزء و کل'], '#9F87B7'],
  ['09-big-and-small', 'مقایسهٔ اندازه‌ها', 'بزرگ و کوچولو', 'دوست بزرگ یا کوچولو رو پیدا کن!', ['شناخت اندازه', 'مقایسه'], '#8CA279'],
  ['10-celebration', 'شادیِ یک کشف تازه', 'آفرین، پیداش کردی!', 'هر کشف کوچولو، یک جشن شاد!', ['جشن‌های تصویری', 'فرصت دوباره'], '#9679B0'],
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const entries = [];
const only = process.argv.includes('--sample');
try {
  for (const [name, category, title, subtitle, skills, accent] of scenes.filter((s) => !only || s[0] === '02-animal-sounds')) {
    const screenshotPath = `store/screenshots/bazaar-10/${name}.jpg`;
    const screenshot = await data(screenshotPath, 'image/jpeg');
    await page.setContent(`<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><style>
      ${fonts.join('')}*{box-sizing:border-box}body{margin:0;font-family:Vazir,sans-serif;color:#554B64;width:1080px;height:1920px;overflow:hidden}
      .poster{position:relative;width:1080px;height:1920px;background:#FFF9ED url('${background}') center/cover;--accent:${accent}}
      .brand{position:absolute;top:112px;left:110px;width:860px;display:flex;align-items:center;justify-content:center;gap:25px}
      .brand img{width:142px;height:142px;border-radius:36px;box-shadow:0 6px 18px #9e856812;border:2px solid #fff8}
      .brand-title{font-weight:900;font-size:45px;line-height:1.75}.brand-small{font-size:24px;color:#968C9C;margin-top:2px}
      .intro{position:absolute;top:349px;left:60px;width:960px;text-align:center}.category{font-size:26px;font-weight:700;color:var(--accent);display:inline-block;position:relative;padding:0 24px}.category:before,.category:after{content:'✦';font-size:21px;position:absolute;top:1px}.category:before{right:-7px}.category:after{left:-7px}
      h1{font-size:82px;font-weight:900;line-height:1.5;margin:22px 0 10px;white-space:nowrap;color:#554965}.subtitle{font-size:31px;font-weight:500;color:#8E8395;margin:0;line-height:1.9}
      .frame{position:absolute;left:40px;top:682px;width:1000px;padding:17px;background:#fff;border:1px solid #e8e0d9;border-radius:33px;box-shadow:0 26px 65px #775e4826,0 4px 10px #8e75650d}
      .screen{width:964px;height:542.25px;display:block;border-radius:17px;object-fit:contain}.frame:after{content:'';display:block;height:5px;width:105px;background:#e8deeb;border-radius:8px;margin:13px auto 1px}
      .skills{position:absolute;top:1340px;left:80px;width:920px;display:flex;justify-content:center;gap:24px}.skill{display:flex;align-items:center;gap:13px;background:#fffaf3e8;border:1px solid #e8e0d4;border-radius:22px;padding:17px 30px;font-size:27px;font-weight:700;color:#87788f}.dot{width:13px;height:13px;border-radius:50%;background:var(--accent);opacity:.7}
      .features{position:absolute;top:1473px;left:80px;width:920px;display:flex;align-items:center;justify-content:center;gap:26px;color:#8B7D75;font-size:25px}.features span{background:#fffcf4df;border-radius:30px;padding:10px 23px;border:1px solid #e8dfcf}.features b{font-weight:700}
      .closing{position:absolute;top:1580px;left:80px;width:920px;text-align:center;margin:0;font-size:36px;font-weight:700;color:#7d7188;line-height:1.8}.closing i{font-style:normal;font-size:28px;color:#BEA376;padding:0 15px}
    </style><main class="poster"><header class="brand"><img src="${logo}" alt="لوگوی برنامه"><div><div class="brand-title">باغ بازی‌های کوچولو</div><div class="brand-small">بازی‌های آموزشی فارسی</div></div></header><section class="intro"><span class="category">${category}</span><h1>${title}</h1><p class="subtitle">${subtitle}</p></section><div class="frame"><img class="screen" src="${screenshot}" alt="${title}"></div><div class="skills">${skills.map((s) => `<span class="skill"><i class="dot"></i>${s}</span>`).join('')}</div><div class="features"><span><b>۳ تا ۵ سال</b></span><span>آفلاین</span><span>بدون تبلیغات</span></div><p class="closing"><i>✧</i>با هم بازی کنیم، با هم یاد بگیریم<i>✧</i></p></main></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    const layout = await page.evaluate(() => ({ fits: document.querySelector('h1').scrollWidth <= document.querySelector('.intro').clientWidth, screenRatio: document.querySelector('.screen').getBoundingClientRect().width / document.querySelector('.screen').getBoundingClientRect().height }));
    if (!layout.fits || Math.abs(layout.screenRatio - 16 / 9) > 0.001) throw new Error(`Unexpected image/title layout: ${name}`);
    const filename = `${name}-portrait.jpg`;
    await page.screenshot({ path: path.join(output, filename), type: 'jpeg', quality: 96 });
    entries.push({ filename, title, sourceScreenshot: screenshotPath, sourceSha256: hash(await readFile(path.join(root, screenshotPath))), sha256: hash(await readFile(path.join(output, filename))), width: 1080, height: 1920 });
  }
  if (!only) await writeFile(path.join(output, 'provenance.json'), JSON.stringify({ type: 'designed-portrait-store-posters', width: 1080, height: 1920, background: { path: bgPath, origin: 'image_gen original garden background using app palette references', sha256: hash(await readFile(path.join(root, bgPath))) }, logo: logoPath, typography: 'Vazirmatn', screenshotSource: 'Existing actual APK UI rendered in mobile Chromium; not native device captures', nativeAndroidCapture: false, createdAt: new Date().toISOString(), entries }, null, 2) + '\n');
  console.log(`Designed ${entries.length} portrait images at 1080x1920.`);
} finally { await browser.close(); }
