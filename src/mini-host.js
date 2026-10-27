import { chime, tryAgainTone, speakPersian, stopSound } from './audio.js';
import { createFeedback } from './feedback.js';
import { createColorsGame } from './games/colors.js';
import { createShapesGame } from './games/shapes.js';
import { createCountingGame } from './games/counting.js';
import { createPuzzleGame } from './games/puzzle.js';
import { createSizesGame } from './games/sizes.js';
import './mini-host.css';

const factories = {
  colors: createColorsGame,
  shapes: createShapesGame,
  counting: createCountingGame,
  puzzle: createPuzzleGame,
  sizes: createSizesGame,
};
export const supportsMiniGame = (id) => Object.hasOwn(factories, id);
const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  sound: '<path d="m11 4-5 4H3v8h3l5 4z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 4-5 4H3v8h3l5 4z"/><path d="m16 9 6 6m0-6-6 6"/>',
  replay: '<path d="M3 10a9 9 0 1 1 2.7 8.4M3 4v6h6"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
  settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m9 3-.6 2.1-2 .9-2-.5-2 3.5 1.5 1.6v2.8L2.4 15l2 3.5 2-.5 2 .9L9 21h4l.6-2.1 2-.9 2 .5 2-3.5-1.5-1.6v-2.8l1.5-1.6-2-3.5-2 .5-2-.9L13 3Z"/>',
  help: '<path d="M9 18h6m-5 3h4m-7-10a5 5 0 1 1 10 0c0 3-2 3-2 6H9c0-3-2-3-2-6Z"/>',
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const flower = '<svg class="flower" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 17C9-3 0 21 16 24-4 34 20 48 24 32c7 20 25 0 9-8 21-7 0-25-9-7Z" fill="currentColor"/><circle cx="24" cy="24" r="6" fill="#e9b94e"/></svg>';
const fa = (n) => n.toLocaleString('fa-IR');

export function createMiniHost({ root, getSettings, onHome, onSettings, onSoundToggle, onFullscreen, isActive }) {
  root.innerHTML = `
    <main class="game-canvas mini-canvas" aria-labelledby="mini-title">
      <header class="game-toolbar">
        <div class="game-heading"><button class="icon-button" id="mini-back" aria-label="بازگشت به فهرست بازی‌ها">${icon('home')}</button><h1 id="mini-title"></h1></div>
        <div class="flower-progress" id="mini-progress"></div><span class="sr-only" id="mini-round-label"></span>
        <div class="toolbar-controls">
          <button class="icon-button" id="mini-sound" aria-label="خاموش کردن صدا" aria-pressed="false">${icon('sound')}</button>
          <button class="icon-button" id="mini-restart" aria-label="شروع دوبارهٔ بازی">${icon('replay')}</button>
          <button class="icon-button" id="mini-fullscreen" aria-label="تمام‌صفحه">${icon('expand')}</button>
          <button class="icon-button" id="mini-settings" aria-label="تنظیمات برای بزرگ‌ترها">${icon('settings')}</button>
        </div>
      </header>
      <section id="mini-stage" class="animal-stage mini-stage" aria-label="صفحهٔ بازی">
        <div class="scene-message" id="mini-message-box" role="status" aria-live="polite" aria-atomic="true"><span id="mini-message"></span></div>
        <div id="mini-content" class="mini-content"></div>
      </section>
      <div class="play-controls"><button class="listen-button mini-help" id="mini-help"><span class="listen-icon">${icon('help')}</span><span>یه راهنمایی کوچولو</span></button></div>
    </main>
    <aside id="mini-orientation-notice" class="orientation-notice" aria-label="گوشی را افقی نگه دارید">
      <svg class="rotate-phone" viewBox="0 0 130 130" fill="none" aria-hidden="true"><rect x="43" y="24" width="44" height="80" rx="9" stroke="currentColor" stroke-width="5"/><path d="M58 94h14M17 58a50 50 0 0 1 86-28m-1-14 4 17-18-1M113 72a50 50 0 0 1-86 28m1 14-4-17 18 1" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h2 id="mini-orientation-title" tabindex="-1">گوشی رو بچرخون!</h2><p>وقت بازی توی صفحهٔ افقیه</p>
      <button class="secondary-button orientation-back" id="mini-orientation-back">${icon('home')}برگشت به بازی‌ها</button>
    </aside>
    <dialog class="modal celebration-modal" id="mini-finish" aria-labelledby="mini-finish-title">
      <div class="bouquet" aria-hidden="true">${flower}${flower}${flower}</div><h2 id="mini-finish-title">چه خوب بازی کردی!</h2><p>همهٔ گل‌هات رو گرفتی! دوباره بازی کنیم؟</p>
      <button class="primary-button" id="mini-play-again">${icon('replay')}باز هم بازی کنیم</button>
      <button class="text-button" id="mini-finish-home">برگشت به بازی‌ها</button>
    </dialog>`;
  const $ = (selector) => root.querySelector(selector);
  const feedback = createFeedback($('#mini-stage'), { id: 'mini-answer-feedback' });
  const content = $('#mini-content');
  let game;
  let controller;
  let round = 0;
  let locked = false;
  let correctPending = false;
  let complete = false;
  let finishPending = false;
  let prompt = '';
  let generation = 0;
  let reactionTimer;
  let hintTimer;
  const portrait = () => innerWidth < 700 && innerHeight > innerWidth;
  const blocked = () => !game || !isActive(game.id) || portrait() || document.hidden || !!document.querySelector('dialog[open]');

  function setPrompt(text) {
    prompt = text;
    $('#mini-message').textContent = text;
    $('#mini-message-box').className = 'scene-message';
  }

  function clearVisuals() {
    feedback.clear();
    for (const element of content.querySelectorAll('.is-correct,.try-again')) element.classList.remove('is-correct', 'try-again');
  }

  function render() {
    const count = controller?.roundCount || 5;
    const found = complete ? count : round + (correctPending ? 1 : 0);
    for (const [index, element] of [...root.querySelectorAll('[data-mini-flower]')].entries()) element.classList.toggle('earned', index < found);
    $('#mini-progress').setAttribute('aria-label', `${fa(found)} گل از ${fa(count)} گل`);
    $('#mini-round-label').textContent = complete ? 'همهٔ گل‌ها رو گرفتی!' : `نوبت ${fa(round + 1)} از ${fa(count)}`;
    $('#mini-help').disabled = locked || complete;
    controller?.setDisabled(locked || complete);
  }

  function narrate() {
    const settings = getSettings();
    if (!blocked() && settings.narration && !settings.muted) speakPersian(prompt, settings.volume);
  }

  function beginRound() {
    clearVisuals();
    locked = false;
    correctPending = false;
    controller.startRound(round);
    render();
    narrate();
  }

  function submit(correct, element, successText = 'آفرین! درست انجام دادی!') {
    if (blocked() || locked || complete || !element || !content.contains(element)) return false;
    clearVisuals();
    stopSound();
    locked = true;
    correctPending = correct;
    element.classList.add(correct ? 'is-correct' : 'try-again');
    $('#mini-message').textContent = correct ? successText : 'اوپس! این نبود؛ دوباره امتحان کنیم!';
    $('#mini-message-box').className = `scene-message ${correct ? 'success' : 'gentle'}`;
    feedback.show(correct ? 'correct' : 'wrong');
    const settings = getSettings();
    if (!settings.muted) {
      (correct ? chime : tryAgainTone)(settings.volume);
      if (settings.narration) speakPersian(correct ? 'آفرین! چه خوب!' : 'این نبود!', settings.volume);
    }
    render();
    const token = generation;
    reactionTimer = setTimeout(() => {
      if (token !== generation || !game || !isActive(game.id)) return;
      clearVisuals();
      locked = false;
      correctPending = false;
      if (!correct) {
        controller.retry();
        setPrompt(prompt);
        render();
        narrate();
        return;
      }
      round++;
      if (round >= controller.roundCount) {
        complete = true;
        finishPending = true;
        setPrompt('آفرین! همهٔ گل‌هات رو گرفتی!');
        render();
        resume();
      } else beginRound();
    }, correct ? 1900 : 1400);
    return true;
  }

  function stopTimers() {
    clearTimeout(reactionTimer);
    clearTimeout(hintTimer);
    content.classList.remove('mini-hinting');
  }

  function close() {
    generation++;
    stopTimers();
    stopSound();
    clearVisuals();
    if ($('#mini-finish').open) $('#mini-finish').close();
    controller?.destroy();
    controller = null;
    game = null;
    content.replaceChildren();
    locked = false;
    correctPending = false;
    complete = false;
    finishPending = false;
  }

  function updateSoundControl() {
    const { muted } = getSettings();
    $('#mini-sound').innerHTML = icon(muted ? 'muted' : 'sound');
    $('#mini-sound').setAttribute('aria-pressed', String(muted));
    $('#mini-sound').setAttribute('aria-label', muted ? 'روشن کردن صدا' : 'خاموش کردن صدا');
  }

  function open(nextGame) {
    close();
    if (!supportsMiniGame(nextGame.id)) throw new Error('Unknown mini game');
    game = nextGame;
    round = 0;
    root.dataset.game = game.id;
    $('.mini-canvas').dataset.miniGame = game.id;
    $('#mini-title').textContent = game.title;
    controller = factories[game.id]({ mount: content, submit, setPrompt, random: Math.random });
    $('#mini-progress').innerHTML = Array.from({ length: controller.roundCount }, (_, index) => `<span class="progress-flower" data-mini-flower="${index}">${flower}</span>`).join('');
    updateSoundControl();
    beginRound();
  }

  function pause() {
    stopSound();
    clearTimeout(hintTimer);
    content.classList.remove('mini-hinting');
    clearVisuals();
    if (locked && !correctPending) {
      clearTimeout(reactionTimer);
      locked = false;
      controller?.retry();
    }
    if (game) { setPrompt(prompt); render(); }
  }

  function restart() {
    if (!game) return;
    const sameGame = game;
    open(sameGame);
  }

  function resume() {
    if (finishPending && !blocked()) {
      finishPending = false;
      $('#mini-finish').showModal();
    }
  }

  function hint() {
    if (blocked() || locked || complete) return;
    content.classList.remove('mini-hinting');
    void content.offsetWidth;
    content.classList.add('mini-hinting');
    controller.hint?.();
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => content.classList.remove('mini-hinting'), 900);
    narrate();
  }

  $('#mini-back').addEventListener('click', onHome);
  $('#mini-orientation-back').addEventListener('click', onHome);
  $('#mini-finish-home').addEventListener('click', onHome);
  $('#mini-sound').addEventListener('click', onSoundToggle);
  $('#mini-settings').addEventListener('click', onSettings);
  $('#mini-fullscreen').addEventListener('click', onFullscreen);
  $('#mini-restart').addEventListener('click', restart);
  $('#mini-help').addEventListener('click', hint);
  $('#mini-play-again').addEventListener('click', () => { $('#mini-finish').close(); restart(); });
  document.addEventListener('fullscreenchange', () => {
    $('#mini-fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه');
  });

  return {
    open, close, pause, resume, restart, updateSoundControl,
    getFocusTarget: () => portrait() ? $('#mini-orientation-title') : content.querySelector('button:not(:disabled)') || $('#mini-help'),
  };
}
