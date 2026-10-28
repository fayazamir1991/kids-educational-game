import { GAMES } from './catalog.js';
import { renderCover } from './home-art.js';
import './home.css';

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const soundIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m11 4-5 4H3v8h3l5 4z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const categoryIcons = {
  'animal-sounds': soundIcon,
  picture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6m-3-3v6"/></svg>',
  lunch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><ellipse cx="12" cy="15" rx="9" ry="5"/><path d="M8 6h.01M12 4h.01M16 6h.01M6 14q6 5 12 0"/></svg>',
  colors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="8" cy="8" r="4"/><circle cx="16" cy="8" r="4"/><circle cx="12" cy="16" r="4"/></svg>',
  shapes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m7 3 5 9H2Z"/><rect x="12" y="12" width="9" height="9" rx="2"/><circle cx="18" cy="6" r="3"/></svg>',
  counting: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="19" cy="12" r="3"/></svg>',
  puzzle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3 9h6c-3-7 9-7 6 0h6v6c-7-3-7 9 0 6H3v-6c7 3 7-9 0-6Z"/></svg>',
  sizes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="8" cy="11" r="6"/><circle cx="19" cy="15" r="3"/></svg>',
};
const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.5 4.8a1 1 0 0 1 1.5-.86l10.5 7.2a1 1 0 0 1 0 1.72L10 20.06a1 1 0 0 1-1.5-.86Z"/></svg>';
const brandIcon = '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M23 22C6 26 5 10 11 7c7-4 14 5 12 15Z" fill="#DDB5CA"/><path d="M26 22C22 5 38 4 41 10c4 7-5 14-15 12Z" fill="#B0C29B"/><path d="M26 25c17-4 18 12 12 15-7 4-14-5-12-15Z" fill="#D5C2E8"/><path d="M23 25c4 17-12 18-15 12-4-7 5-14 15-12Z" fill="#EDCE84"/><circle cx="24.5" cy="23.5" r="4.5" fill="#FFFCED"/></svg>';

function gameCard(game) {
  return `<li class="home-game-item">
    <article class="home-game-card home-game-${escapeHTML(game.id)}" aria-labelledby="${escapeHTML(game.id)}-title" style="--card-accent:${game.accent};--card-accent-dark:${game.accentDark};--cover-background:${game.coverBackground}">
      <div class="home-game-cover" aria-hidden="true">${renderCover(game)}</div>
      <div class="home-game-info">
        <div class="home-game-meta"><span class="home-category">${categoryIcons[game.id] || soundIcon}${escapeHTML(game.category)}</span><span class="home-game-age">${escapeHTML(game.age)}</span></div>
        <h2 id="${escapeHTML(game.id)}-title">${escapeHTML(game.title)}</h2>
        <p>${escapeHTML(game.description)}</p>
        <ul class="home-game-skills" aria-label="مهارت‌های این بازی">${game.skills.map((skill) => `<li>${escapeHTML(skill)}</li>`).join('')}</ul>
        <button class="home-play-button" id="open-${escapeHTML(game.id)}" data-open-game="${escapeHTML(game.id)}" aria-label="بازی ${escapeHTML(game.title)}">${playIcon}<span>بازی کنیم</span><span class="home-play-spark" aria-hidden="true">✧</span></button>
      </div>
    </article>
  </li>`;
}

export function renderHome() {
  return `<main id="home-screen" class="home-screen" aria-labelledby="home-title">
    <div class="home-content">
      <header class="home-header"><div class="home-brand"><span class="home-brand-mark">${brandIcon}</span><span>باغ بازی‌های کوچولو</span></div><button id="parents-button" class="home-parents-button" aria-label="بخش والدین"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg><span>والدین</span></button></header>
      <section class="home-intro">
        <span class="home-eyebrow"><span aria-hidden="true"></span>بازی‌های کوچک، کشف‌های بزرگ</span>
        <h1 id="home-title" tabindex="-1">امروز چی <span>بازی کنیم؟<svg viewBox="0 0 230 14" fill="none" aria-hidden="true"><path d="M3 8c54-7 132-9 224-2M21 12c63-5 126-5 182-1" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span></h1>
        <p>یک بازی انتخاب کن؛ یک دنیای تازه کشف کن.</p>
      </section>
      <section class="home-catalog-section" aria-labelledby="home-games-title">
        <div class="home-catalog-heading"><h2 id="home-games-title">بازی‌های ما</h2><span>${GAMES.length.toLocaleString('fa-IR')} بازی برای کوچولوها</span></div>
        <ul class="game-catalog">${GAMES.map(gameCard).join('')}</ul>
      </section>
      <footer class="home-footer"><span aria-hidden="true">✦</span>با هم بازی کنیم، با هم یاد بگیریم<span aria-hidden="true">✦</span></footer>
    </div>
  </main>`;
}
