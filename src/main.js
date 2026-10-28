import '@fontsource/vazirmatn/arabic-500.css';
import '@fontsource/vazirmatn/arabic-700.css';
import '@fontsource/vazirmatn/arabic-800.css';
import './style.css';
import { ANIMALS, PLAYABLE_ANIMALS, AUDIO_REVIEW, ROUND_COUNT, animalById, createRounds, checkAnswer } from './game.js';
import { playAnimal, stopSound, chime, tryAgainTone, speakPersian } from './audio.js';
import { asset } from './assets.js';
import allRecordings from './recordings.json';
import { renderHome } from './home.js';
import { GAMES } from './catalog.js';
import { createFeedback } from './feedback.js';
import { createMiniHost, supportsMiniGame } from './mini-host.js';
import { createParentArea } from './parents.js';
import { initNativeApp, isNativeApp, setNativeGameMode, openExternal } from './native.js';
import publisher from '../store/publisher.json';
import { narrationClipCount } from './narration.js';

const STORE_BUILD = import.meta.env.VITE_STORE_BUILD === '1';
const recordings = STORE_BUILD ? allRecordings.filter(({ id }) => AUDIO_REVIEW.animals[id]?.enabled) : allRecordings;

const paths = {
  sound: '<path d="m11 4-5 4H3v8h3l5 4z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 4-5 4H3v8h3l5 4z"/><path d="m16 9 6 6m0-6-6 6"/>',
  settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m9 3-.6 2.1-2 .9-2-.5-2 3.5 1.5 1.6v2.8L2.4 15l2 3.5 2-.5 2 .9L9 21h4l.6-2.1 2-.9 2 .5 2-3.5-1.5-1.6v-2.8l1.5-1.6-2-3.5-2 .5-2-.9L13 3Z"/>',
  replay: '<path d="M3 10a9 9 0 1 1 2.7 8.4M3 4v6h6"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const flower = () => '<svg class="flower" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 17C9-3 0 21 16 24-4 34 20 48 24 32c7 20 25 0 9-8 21-7 0-25-9-7Z" fill="currentColor"/><circle cx="24" cy="24" r="6" fill="#e9b94e"/></svg>';
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safeURL = (value) => { try { const url = new URL(value); return url.protocol === 'https:' ? escapeHTML(url.href) : '#'; } catch { return '#'; } };
const $ = (selector) => document.querySelector(selector);
const fa = (value) => value.toLocaleString('fa-IR');

document.querySelector('#app').innerHTML = `
  ${renderHome()}
  <section id="game-screen" class="game-screen" aria-label="بازی انتخاب‌شده" hidden>
  <main class="game-canvas" aria-label="بازی کی صدا کرد؟">
    <header class="game-toolbar">
      <div class="game-heading"><button class="icon-button" id="back-to-games" data-go-home aria-label="بازگشت به فهرست بازی‌ها">${icon('home')}</button><h1>کی صدا کرد؟ <span aria-hidden="true">✧</span></h1></div>
      <div id="progress" class="flower-progress" aria-label="صفر گل از پنج گل">${Array.from({ length: ROUND_COUNT }, (_, index) => `<span class="progress-flower" data-flower="${index}">${flower()}</span>`).join('')}</div>
      <div class="toolbar-controls">
        <button class="icon-button" id="sound-toggle" aria-label="خاموش کردن صدا" aria-pressed="false">${icon('sound')}</button>
        <button class="icon-button" id="fullscreen-button" aria-label="تمام‌صفحه">${icon('expand')}</button>
        <button class="icon-button" id="settings-button" aria-label="تنظیمات برای بزرگ‌ترها">${icon('settings')}</button>
      </div>
    </header>
    <section class="animal-stage" aria-label="حیوان درست را پیدا کن">
      <div class="scene-message" id="scene-message" aria-live="polite" aria-atomic="true"><span id="message-text">بزن تا بشنوی، بعد پیداش کن!</span></div>
      <span class="sr-only" id="round-label">آماده‌ای بازی کنیم؟</span>
      <div class="animals" id="animals"></div>
      <div class="confetti" id="confetti" aria-hidden="true"></div>
    </section>
    <div class="play-controls">
      <button class="listen-button" id="listen-button"><span class="listen-icon">${icon('sound')}</span><span id="listen-title">بزن تا بشنوی</span><span class="listen-deco" aria-hidden="true">♪</span></button>
    </div>
  </main>
  <aside id="orientation-notice" class="orientation-notice" aria-label="گوشی را افقی نگه دارید">
    <svg class="rotate-phone" viewBox="0 0 130 130" fill="none" aria-hidden="true"><rect x="43" y="24" width="44" height="80" rx="9" stroke="currentColor" stroke-width="5"/><path d="M58 94h14M17 58a50 50 0 0 1 86-28m-1-14 4 17-18-1M113 72a50 50 0 0 1-86 28m1 14-4-17 18 1" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <h2 id="orientation-title" tabindex="-1">گوشی رو بچرخون!</h2><p>دوست‌هات توی صفحهٔ افقی منتظرتن</p>
    <button class="secondary-button orientation-back" id="orientation-back" data-go-home>${icon('home')}برگشت به بازی‌ها</button>
  </aside>
  </section>
  <section id="mini-game-screen" class="game-screen" aria-label="بازی انتخاب‌شده" hidden></section>
  <dialog id="settings-dialog" class="modal" aria-labelledby="settings-title">
    <button class="icon-button modal-close" data-close="settings-dialog" aria-label="بستن تنظیمات">${icon('close')}</button>
    <h2 id="settings-title">برای بزرگ‌ترها</h2>
    <label class="volume-label" for="volume">بلندی صدا <span id="volume-value">۶۵٪</span></label>
    <input id="volume" type="range" min="15" max="100" value="65" />
    <label class="toggle-row"><span>راهنمای صوتی فارسی<small id="narration-note">با صدای فارسیِ دستگاه، در صورت پشتیبانی</small></span><input id="narration" type="checkbox" role="switch" checked /><span class="toggle-track" aria-hidden="true"></span></label>
    <p class="parent-note">بازبینی صداها · نسخهٔ ۳<br />${fa(PLAYABLE_ANIMALS.length)} صدای فعال${STORE_BUILD ? '' : ` از ${fa(ANIMALS.length)} حیوان`}؛ در هر نوبت سه گزینهٔ تصادفی، بدون محدودیت زمانی و امتیاز منفی.</p>
    <details class="review-details" ${STORE_BUILD ? 'hidden' : ''}><summary>صداهایی که فعلاً وارد سؤال‌ها نمی‌شوند</summary><ul id="withheld-list">${ANIMALS.filter((animal) => !AUDIO_REVIEW.animals[animal.id]?.enabled).map((animal) => `<li><strong>${animal.name}:</strong> ${escapeHTML(AUDIO_REVIEW.animals[animal.id].reason_fa)}</li>`).join('')}</ul></details>
    <button class="secondary-button" id="credits-button">${icon('info')}شنیدن و منابع صداها</button>
    <button class="secondary-button" id="restart-button">${icon('replay')}شروع دوبارهٔ بازی</button>
  </dialog>
  <dialog id="credits-dialog" class="modal credits-modal" aria-labelledby="credits-title">
    <button class="icon-button modal-close" data-close="credits-dialog" aria-label="بستن منابع">${icon('close')}</button>
    <h2 id="credits-title">بشنوید و منبع را ببینید</h2>
    <section aria-label="منابع دیگر برنامه"><p>تصویرها و طرح بازی‌ها برای این پروژه ساخته شده‌اند. فونت فارسی «وزیرمتن» با مجوز SIL OFL 1.1 و چارچوب Capacitor با مجوز MIT استفاده شده‌اند. متن مجوزها همراه بستهٔ برنامه نگهداری می‌شود.</p><p><a href="https://github.com/rastikerdar/vazirmatn/blob/master/OFL.txt" target="_blank" rel="noopener noreferrer">مجوز فونت</a> · <a href="https://github.com/ionic-team/capacitor/blob/8.5.3/LICENSE" target="_blank" rel="noopener noreferrer">مجوز Capacitor</a></p></section>
    <p class="credits-intro">ضبط‌ها کوتاه و بلندی صداها یکدست شده است. بررسی ماشینی کمک کرده نمونه‌های مشکوک کنار گذاشته شوند؛ این بررسی معادل تأیید شنیداری انسانی نیست.</p>
    <p class="sr-only" id="audition-status" role="status" aria-live="polite"></p>
    <ul class="credits-list">${recordings.map((recording) => `<li data-recording="${recording.id}"><strong>${escapeHTML(animalById(recording.id)?.name || recording.id)}</strong><button class="audition-button" data-audition="${recording.id}" aria-pressed="false" aria-label="شنیدن صدای ${escapeHTML(animalById(recording.id)?.name || recording.id)}">${icon('sound')}<span>بشنو</span></button><small class="review-status ${AUDIO_REVIEW.animals[recording.id]?.enabled ? '' : 'withheld'}">${AUDIO_REVIEW.animals[recording.id]?.enabled ? 'فعال در سؤال‌ها' : 'فعلاً خارج از سؤال‌ها'}</small><span>${escapeHTML(recording.source_title)} · ${escapeHTML(recording.creator)} · ${escapeHTML(recording.license)}</span><a href="${safeURL(recording.source_url)}" target="_blank" rel="noopener noreferrer">منبع ضبط</a><a href="${safeURL(recording.license_url)}" target="_blank" rel="noopener noreferrer">اطلاعات مجوز</a></li>`).join('')}</ul>
  </dialog>
  <dialog id="celebration-dialog" class="modal celebration-modal" aria-labelledby="celebration-title">
    <div class="bouquet" aria-hidden="true">${flower()}${flower()}${flower()}</div><h2 id="celebration-title">چه خوب گوش دادی!</h2><p>پنج دوست رو پیدا کردی! باز هم بازی کنیم؟</p>
    <button class="primary-button" id="play-again">${icon('replay')}باز هم بازی کنیم</button>
    <button class="text-button" data-close="celebration-dialog">یک کم استراحت کنیم</button>
  </dialog>
`;

const settings = { volume: 0.65, muted: false, narration: true };
try {
  const saved = JSON.parse(localStorage.getItem('little-farm-settings'));
  if (saved && typeof saved === 'object') {
    if (typeof saved.volume === 'number' && Number.isFinite(saved.volume)) settings.volume = Math.max(0.15, Math.min(1, saved.volume));
    if (typeof saved.muted === 'boolean') settings.muted = saved.muted;
    if (typeof saved.narration === 'boolean') settings.narration = saved.narration;
  }
} catch { /* The game works when preference storage is unavailable. */ }
const state = { rounds: createRounds(), round: 0, started: false, heard: false, playing: false, locked: false, retrying: false, completed: false, run: 0 };
const answerFeedback = createFeedback($('.animal-stage'));
const CORRECT_REACTION_MS = 1900;
const RETRY_REACTION_MS = 1400;
let advanceTimer;
let feedbackTimer;
let audioRequest = 0;
let auditionRequest = 0;
let activeGameId = null;
let currentScreen = null;
let returningHome = false;
let nativePaused = false;
const ANIMAL_SOUNDS_ID = 'animal-sounds';
const isPortrait = () => innerWidth < 700 && innerHeight > innerWidth;
const hasModal = () => !!document.querySelector('dialog[open]');
const saveSettings = () => { try { localStorage.setItem('little-farm-settings', JSON.stringify(settings)); } catch { /* optional */ } };
const miniHost = createMiniHost({
  root: $('#mini-game-screen'),
  getSettings: () => settings,
  onHome: goHome,
  onSettings: openSettings,
  onSoundToggle: toggleGlobalSound,
  onFullscreen: toggleFullscreen,
  isActive: (id) => activeGameId === id,
  isSuspended: () => nativePaused,
});
const parents = createParentArea({
  onPause: () => { pauseCurrentGame(); stopSound(); },
  onResume: resumeCurrentGame,
  onOpenSettings: showSettings,
  onOpenCredits: showCredits,
  onExternal: openExternal,
  onResetPreferences: () => {
    stopSound();
    Object.assign(settings, { volume: 0.65, muted: false, narration: true });
    try { localStorage.removeItem('little-farm-settings'); } catch { /* Storage is optional. */ }
    syncSettingsControls();
    updateSoundControl();
  },
  publisher: { name: publisher.publisherName, supportEmail: publisher.supportEmail },
});

function resumeCurrentGame() {
  if (document.hidden || nativePaused || hasModal() || isPortrait()) return;
  if (activeGameId && activeGameId !== ANIMAL_SOUNDS_ID) miniHost.resume();
  else if (activeGameId === ANIMAL_SOUNDS_ID && state.completed) $('#celebration-dialog').showModal();
}

function syncSettingsControls() {
  $('#volume').value = Math.round(settings.volume * 100);
  $('#volume-value').textContent = `${fa(Math.round(settings.volume * 100))}٪`;
  $('#narration').checked = settings.narration;
}

function message(text, kind = '') {
  $('#message-text').textContent = text;
  $('#scene-message').className = `scene-message ${kind}`;
}

function drawAnimals() {
  $('#animals').innerHTML = state.rounds[state.round].choices.map((id) => {
    const animal = animalById(id);
    return `<button class="animal" data-animal="${id}" aria-label="${animal.name}" style="--animal-color:${animal.color}"><span class="animal-art"><span class="animal-halo"></span><img src="${asset(`/art/${id}.svg`)}" alt="" draggable="false" /><span class="correct-check">${icon('check')}</span></span><span class="animal-name">${animal.name}</span></button>`;
  }).join('');
}

function updateSoundControl() {
  $('#sound-toggle').innerHTML = icon(settings.muted ? 'muted' : 'sound');
  $('#sound-toggle').setAttribute('aria-pressed', String(settings.muted));
  $('#sound-toggle').setAttribute('aria-label', settings.muted ? 'روشن کردن صدا' : 'خاموش کردن صدا');
  miniHost.updateSoundControl();
}

function pauseCurrentGame() {
  if (activeGameId === ANIMAL_SOUNDS_ID) pauseAudio();
  else if (activeGameId) miniHost.pause();
}

function focusCurrentGame() {
  if (activeGameId === ANIMAL_SOUNDS_ID) (isPortrait() ? $('#orientation-title') : $('#listen-button')).focus({ preventScroll: true });
  else if (activeGameId) miniHost.getFocusTarget()?.focus({ preventScroll: true });
  else $('#home-title').focus({ preventScroll: true });
}

function openSettings() {
  parents.openSettings();
}

function showSettings() {
  pauseCurrentGame();
  const animalGame = activeGameId === ANIMAL_SOUNDS_ID;
  for (const selector of ['.parent-note', '#credits-button']) $(selector).hidden = !animalGame;
  $('.review-details').hidden = STORE_BUILD || !animalGame;
  $('#restart-button').hidden = !activeGameId;
  $('#settings-dialog').showModal();
}

function showCredits() {
  $('#settings-dialog').close();
  $('#credits-dialog').showModal();
}

function toggleGlobalSound() {
  settings.muted = !settings.muted;
  if (settings.muted) pauseCurrentGame();
  updateSoundControl();
  saveSettings();
}

function render() {
  const found = state.completed ? ROUND_COUNT : state.round + (state.locked ? 1 : 0);
  $('#round-label').textContent = state.completed ? 'همهٔ دوست‌ها رو پیدا کردی!' : state.started ? `دوست ${fa(state.round + 1)} از ${fa(ROUND_COUNT)}` : 'آماده‌ای بازی کنیم؟';
  $('#progress').setAttribute('aria-label', `${fa(found)} گل از ${fa(ROUND_COUNT)} گل`);
  document.querySelectorAll('[data-flower]').forEach((element, index) => element.classList.toggle('earned', index < found));
  $('#listen-button').disabled = state.locked || state.retrying;
  $('#listen-button').classList.toggle('is-playing', state.playing);
  $('#listen-button').setAttribute('aria-label', state.completed ? 'شروع دوبارهٔ بازی' : state.playing ? 'دوباره پخش کردن صدای حیوان' : state.started ? 'دوباره شنیدن صدای حیوان' : 'شروع بازی و شنیدن صدای حیوان');
  $('#listen-title').textContent = state.completed ? 'باز هم بازی کنیم' : state.playing ? 'خوب گوش کن...' : state.started ? 'دوباره بشنو' : 'بزن تا بشنوی';
  document.querySelectorAll('[data-animal]').forEach((button) => { button.disabled = state.locked || state.retrying || state.completed; });
}

async function listen(userInitiated = false) {
  if (activeGameId !== ANIMAL_SOUNDS_ID || state.locked || state.retrying || isPortrait() || hasModal() || document.hidden || nativePaused) return;
  if (state.completed) reset();
  if (settings.muted) { settings.muted = false; updateSoundControl(); saveSettings(); }
  state.started = true;
  state.heard = false;
  state.playing = true;
  const request = ++audioRequest;
  const run = state.run;
  message('خوب گوش کن... کی صدا کرد؟');
  render();
  const success = await playAnimal(state.rounds[state.round].target, settings.volume, userInitiated === true);
  if (request !== audioRequest || run !== state.run || state.locked) return;
  state.playing = false;
  state.heard = success;
  message(success ? 'صدای کدوم دوست بود؟' : 'صدا پخش نشد؛ دوباره دکمه رو بزن', success ? '' : 'gentle');
  render();
}

function clearReaction() {
  clearTimeout(feedbackTimer);
  state.retrying = false;
  answerFeedback.clear();
  for (const button of document.querySelectorAll('[data-animal]')) button.classList.remove('try-again', 'is-correct');
}

function stopAudition() {
  auditionRequest++;
  stopSound();
  for (const button of document.querySelectorAll('[data-audition]')) {
    button.setAttribute('aria-pressed', 'false');
    button.querySelector('span').textContent = 'بشنو';
  }
}

function pauseAudio() {
  audioRequest++;
  clearReaction();
  stopAudition();
  state.playing = false;
  state.heard = false;
  if (!state.locked && !state.completed && state.started) message('آماده‌ای؟ دوباره صدا رو بشنو');
  render();
}

function choose(id, button) {
  if (activeGameId !== ANIMAL_SOUNDS_ID || state.locked || state.retrying || state.completed || isPortrait() || hasModal() || nativePaused) return;
  if (!state.started || (!state.heard && !state.playing)) {
    message('اول دکمهٔ صدا رو بزن!');
    $('#listen-button').classList.remove('nudge');
    requestAnimationFrame(() => $('#listen-button').classList.add('nudge'));
    return;
  }
  if (!checkAnswer(state.rounds, state.round, id)) {
    clearReaction();
    audioRequest++;
    stopSound();
    state.playing = false;
    state.heard = true;
    state.retrying = true;
    button.classList.add('try-again');
    message('اوپس! این نبود؛ دوباره گوش کنیم!', 'gentle');
    answerFeedback.show('wrong', animalById(id).name);
    if (!settings.muted) {
      tryAgainTone(settings.volume);
      if (settings.narration) speakPersian('این نبود!', settings.volume);
    }
    render();
    const run = state.run;
    feedbackTimer = setTimeout(() => {
      if (activeGameId !== ANIMAL_SOUNDS_ID || run !== state.run) return;
      clearReaction();
      render();
      message('دوباره گوش کن، پیداش می‌کنی!');
      if (!document.hidden && !nativePaused && !isPortrait() && !settings.muted && !hasModal()) void listen();
    }, RETRY_REACTION_MS);
    return;
  }
  state.locked = true;
  state.playing = false;
  audioRequest++;
  stopSound();
  clearReaction();
  button.classList.add('is-correct');
  message(`آفرین! صدای ${animalById(id).name} بود!`, 'success');
  answerFeedback.show('correct', animalById(id).name);
  if (!settings.muted) {
    chime(settings.volume);
    if (settings.narration) speakPersian('آفرین! پیداش کردی!', settings.volume);
  }
  render();
  const run = state.run;
  advanceTimer = setTimeout(() => {
    if (activeGameId !== ANIMAL_SOUNDS_ID || run !== state.run) return;
    clearReaction();
    state.round++;
    state.locked = false;
    state.heard = false;
    if (state.round >= ROUND_COUNT) {
      state.completed = true;
      message('همهٔ دوست‌هات رو پیدا کردی!', 'success');
      render();
      // Re-enable these existing cards on reset, not during the celebration.
      if (!document.hidden && !nativePaused && !isPortrait() && !hasModal()) $('#celebration-dialog').showModal();
    } else {
      drawAnimals();
      message('یک صدای تازه، یک دوست تازه!');
      render();
      if (!document.hidden && !nativePaused && !isPortrait() && !settings.muted && !hasModal()) void listen();
    }
  }, CORRECT_REACTION_MS);
}

function reset() {
  clearTimeout(advanceTimer);
  clearReaction();
  audioRequest++;
  stopSound();
  Object.assign(state, { rounds: createRounds(), round: 0, started: false, heard: false, playing: false, locked: false, retrying: false, completed: false, run: state.run + 1 });
  $('#confetti').replaceChildren();
  drawAnimals();
  message('بزن تا بشنوی، بعد پیداش کن!');
  render();
}

function leaveGame() {
  clearTimeout(advanceTimer);
  clearTimeout(feedbackTimer);
  pauseAudio();
  state.run++;
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  $('#confetti').replaceChildren();
  // The collection can be browsed in either orientation, even after fullscreen.
  try { screen.orientation?.unlock?.(); } catch { /* Optional browser API. */ }
}

function routeFromHash() {
  const match = location.hash.match(/^#\/games\/([a-z0-9-]+)$/);
  const game = match && GAMES.find((item) => item.id === match[1]);
  return game && (game.id === ANIMAL_SOUNDS_ID || supportsMiniGame(game.id)) ? game.id : null;
}

function applyRoute() {
  const gameId = routeFromHash();
  const nextScreen = gameId ? 'game' : 'home';
  returningHome = false;
  if (!gameId && location.hash && location.hash !== '#/') {
    try { history.replaceState(null, '', '#/'); } catch { /* Render the catalog even when history is unavailable. */ }
  }
  if (nextScreen === currentScreen && gameId === activeGameId) return;
  const firstVisit = currentScreen === null;
  if (activeGameId === ANIMAL_SOUNDS_ID) leaveGame();
  else if (activeGameId) {
    miniHost.close();
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    try { screen.orientation?.unlock?.(); } catch { /* Optional browser API. */ }
  }
  activeGameId = gameId;
  parents.lock();
  currentScreen = nextScreen;
  void setNativeGameMode(Boolean(gameId));
  $('#home-screen').hidden = nextScreen !== 'home';
  $('#game-screen').hidden = gameId !== ANIMAL_SOUNDS_ID;
  $('#mini-game-screen').hidden = !gameId || gameId === ANIMAL_SOUNDS_ID;
  document.documentElement.dataset.screen = nextScreen;
  if (gameId) {
    document.title = `${GAMES.find((game) => game.id === gameId).title} · باغ بازی‌های کوچولو`;
    if (gameId === ANIMAL_SOUNDS_ID) reset();
    else miniHost.open(GAMES.find((game) => game.id === gameId));
    focusCurrentGame();
  } else {
    document.title = 'باغ بازی‌های کوچولو · بازی‌های آموزشی کودکان';
    if (!firstVisit) $('#home-title').focus({ preventScroll: true });
  }
}

function openGame(id) {
  if (!(id === ANIMAL_SOUNDS_ID || supportsMiniGame(id)) || !GAMES.some((game) => game.id === id)) return;
  try {
    history.pushState({ littleGames: true, fromCatalog: true }, '', `#/games/${id}`);
    applyRoute();
  } catch {
    // Normal file:// browsers allow fragment navigation too.
    location.hash = `/games/${id}`;
  }
}

function goHome() {
  if (returningHome || currentScreen !== 'game') return;
  returningHome = true;
  if (history.state?.littleGames && history.state.fromCatalog) {
    history.back();
  } else {
    try { history.replaceState(null, '', '#/'); applyRoute(); }
    catch { location.hash = '/'; }
  }
}

document.addEventListener('click', (event) => {
  const externalLink = event.target.closest('a[href]');
  if (externalLink && /^https?:/i.test(externalLink.getAttribute('href'))) {
    event.preventDefault();
    parents.openExternal(externalLink.href);
    return;
  }
  const gameButton = event.target.closest('[data-open-game]');
  if (gameButton) openGame(gameButton.dataset.openGame);
  if (event.target.closest('[data-go-home]')) goHome();
});
window.addEventListener('popstate', applyRoute);
window.addEventListener('hashchange', applyRoute);

$('#animals').addEventListener('click', (event) => {
  const button = event.target.closest('[data-animal]');
  if (button) choose(button.dataset.animal, button);
});
$('#listen-button').addEventListener('click', () => void listen(true));
$('#sound-toggle').addEventListener('click', toggleGlobalSound);
$('#settings-button').addEventListener('click', openSettings);
$('#parents-button').addEventListener('click', () => parents.open());
for (const id of ['settings-dialog', 'credits-dialog']) $(`#${id}`).addEventListener('close', () => queueMicrotask(resumeCurrentGame));
syncSettingsControls();
$('#volume').addEventListener('input', (event) => {
  settings.volume = Number(event.target.value) / 100;
  $('#volume-value').textContent = `${fa(Number(event.target.value))}٪`;
  saveSettings();
});
$('#narration').addEventListener('change', (event) => { settings.narration = event.target.checked; saveSettings(); });
$('#restart-button').addEventListener('click', () => {
  $('#settings-dialog').close();
  parents.lock();
  if (activeGameId === ANIMAL_SOUNDS_ID) reset();
  else miniHost.restart();
  focusCurrentGame();
});
$('#credits-button').addEventListener('click', () => parents.openCredits());
$('#credits-dialog').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-audition]');
  if (!button) return;
  if (button.getAttribute('aria-pressed') === 'true') { stopAudition(); return; }
  pauseAudio();
  if (settings.muted) { settings.muted = false; updateSoundControl(); saveSettings(); }
  const request = auditionRequest;
  const id = button.dataset.audition;
  button.setAttribute('aria-pressed', 'true');
  button.querySelector('span').textContent = 'در حال پخش';
  $('#audition-status').textContent = `پخش نمونهٔ ${animalById(id).name}`;
  const success = await playAnimal(id, settings.volume);
  if (request !== auditionRequest) return;
  stopAudition();
  $('#audition-status').textContent = success ? 'پخش نمونه تمام شد' : 'پخش نشد؛ دوباره امتحان کنید';
});
$('#credits-dialog').addEventListener('close', () => { if (activeGameId === ANIMAL_SOUNDS_ID || !activeGameId) stopAudition(); });
$('#play-again').addEventListener('click', () => { $('#celebration-dialog').close(); reset(); void listen(true); });
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => {
  $(`#${button.dataset.close}`).close();
  if (['settings-dialog', 'credits-dialog'].includes(button.dataset.close)) parents.lock();
  focusCurrentGame();
});
for (const id of ['settings-dialog', 'credits-dialog']) $(`#${id}`).addEventListener('cancel', () => parents.lock());
for (const dialog of document.querySelectorAll('.modal')) dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
    dialog.close();
    if (['settings-dialog', 'credits-dialog'].includes(dialog.id)) parents.lock();
  }
});
async function toggleFullscreen() {
  if (isNativeApp()) { await setNativeGameMode(Boolean(activeGameId)); return; }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await document.documentElement.requestFullscreen?.();
      // Orientation lock is optional; unsupported devices keep the rotate hint.
      if (document.fullscreenElement) await screen.orientation?.lock?.('landscape').catch(() => {});
    }
  } catch { /* iOS browsers may not expose document fullscreen. */ }
}
$('#fullscreen-button').addEventListener('click', toggleFullscreen);
function updateFullscreenLabel() { $('#fullscreen-button').setAttribute('aria-label', document.fullscreenElement ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'); }
for (const event of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(event, updateFullscreenLabel);
let wasPortrait = isPortrait();
window.addEventListener('resize', () => {
  const portrait = isPortrait();
  if (activeGameId && portrait && !wasPortrait) pauseCurrentGame();
  if (activeGameId && !portrait && wasPortrait) resumeCurrentGame();
  wasPortrait = portrait;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pauseCurrentGame(); stopSound(); parents.lock(); }
  else resumeCurrentGame();
});
void initNativeApp({
  onBack: () => {
    if (parents.handleBack()) return true;
    const dialog = document.querySelector('dialog[open]');
    if (dialog) { dialog.close(); parents.lock(); return true; }
    if (activeGameId) { goHome(); return true; }
    return false;
  },
  onPause: () => { nativePaused = true; pauseCurrentGame(); stopSound(); parents.lock(); },
  onResume: () => { nativePaused = false; resumeCurrentGame(); },
  onAudioFocusLost: () => { pauseCurrentGame(); stopSound(); },
});
if (narrationClipCount > 0) $('#narration-note').textContent = 'با راهنماهای صوتی همراه برنامه، بدون نیاز به اینترنت';
else if (STORE_BUILD) $('#narration').closest('label').hidden = true;
updateSoundControl();
render();
applyRoute();
