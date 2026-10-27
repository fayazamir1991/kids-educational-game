import './feedback.css';

const happyStar = `<svg class="feedback-mascot feedback-star" viewBox="0 0 100 100" fill="none" aria-hidden="true">
  <path d="m50 7 12 25 28 4-20 20 5 28-25-13-25 13 5-28L10 36l28-4Z" fill="#F6D16B" stroke="#E2B44A" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m50 14 9 20 22 4-16 16 4 22-19-10-19 10 4-22-16-16 22-4Z" fill="#FFE7A1"/>
  <path d="M34 46q5-7 10 0m12 0q5-7 10 0" stroke="#80633B" stroke-width="3.3" stroke-linecap="round"/>
  <path d="M40 57q10 13 20 0" fill="#D78F64" stroke="#80633B" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="31" cy="54" rx="6" ry="3.4" fill="#EDB08D"/><ellipse cx="69" cy="54" rx="6" ry="3.4" fill="#EDB08D"/>
</svg>`;

const kindCloud = `<svg class="feedback-mascot feedback-cloud" viewBox="0 0 100 100" fill="none" aria-hidden="true">
  <path d="M22 77C5 77 3 53 18 48c-5-18 18-31 31-19 10-16 34-7 34 11 20 1 23 31 5 36-7 3-55 2-66 1Z" fill="#FFF7E6" stroke="#DDC29B" stroke-width="2.5"/>
  <path d="m31 48 9-4m21 0 8 5" stroke="#A98B70" stroke-width="2.3" stroke-linecap="round"/>
  <circle cx="36" cy="56" r="3.2" fill="#8E7460"/><circle cx="64" cy="56" r="3.2" fill="#8E7460"/>
  <path d="M44 67q6-5 12 0" stroke="#A98B70" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="25" cy="64" rx="6" ry="3.4" fill="#E9BFAC"/><ellipse cx="75" cy="64" rx="6" ry="3.4" fill="#E9BFAC"/>
  <path d="M48 13q0-8 7-8c8 0 9 9 2 12l-2 3m0 6v.1" stroke="#C9A36B" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const check = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const retry = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M7 17 17 7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

const EFFECTS = ['confetti', 'balloons', 'stars'];
const COLORS = ['#F3B947', '#ED7D98', '#78B9DF', '#9D83D2', '#83BE83', '#F49C65'];
let fallbackSeed = Date.now() % 2147483647 || 1;

// Celebration randomness is independent of the quiz's Math.random sequence.
function visualRandom() {
  if (globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  }
  fallbackSeed = fallbackSeed * 16807 % 2147483647;
  return (fallbackSeed - 1) / 2147483646;
}

const starShape = '<svg viewBox="0 0 50 50" fill="currentColor" aria-hidden="true"><path d="m25 2 7 15 16 2-12 12 3 17-14-8-14 8 3-17L2 19l16-2Z"/><path d="m24 9 3 9 10 2-10 3-3 10-3-10-9-3 9-2Z" fill="#fff" opacity=".38"/></svg>';
const balloonShape = '<svg viewBox="0 0 64 140" fill="none" aria-hidden="true"><path d="M32 75c-15 19 18 27 0 43-5 6-5 12-1 19" stroke="currentColor" stroke-width="2" opacity=".65"/><ellipse cx="32" cy="37" rx="27" ry="34" fill="currentColor"/><path d="m32 68-6 9h12Z" fill="currentColor"/><path d="M18 22c-4 7-6 14-4 20" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".68"/></svg>';

/** Visual response only. The game owns timing, announcements and sound. */
export function createFeedback(stage, { id = 'answer-feedback', random = visualRandom } = {}) {
  if (!stage) throw new Error('Answer feedback needs a game stage.');
  const canvas = stage.closest('.game-canvas');
  if (!canvas) throw new Error('Answer feedback needs a game canvas.');
  const layer = document.createElement('div');
  layer.id = id;
  layer.className = 'answer-feedback';
  layer.hidden = true;
  layer.setAttribute('aria-hidden', 'true');
  // Cover the whole game, including its edges, rather than just its question row.
  canvas.append(layer);
  let previousEffect = '';
  const pick = (items) => items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))];
  const between = (minimum, maximum) => minimum + random() * (maximum - minimum);

  function clear() {
    layer.hidden = true;
    layer.removeAttribute('data-kind');
    layer.removeAttribute('data-effect');
    layer.replaceChildren();
    delete canvas.dataset.feedback;
  }

  function addParticles(effect, container) {
    const count = effect === 'confetti' ? 48 : effect === 'balloons' ? 12 : 28;
    for (let index = 0; index < count; index++) {
      const particle = document.createElement('span');
      particle.className = `feedback-particle ${effect === 'confetti' ? 'feedback-confetti' : effect === 'balloons' ? 'feedback-balloon' : 'feedback-spark'}`;
      particle.dataset.particleType = effect;
      const column = index % (effect === 'balloons' ? 6 : 8);
      const columns = effect === 'balloons' ? 6 : 8;
      particle.style.setProperty('--particle-x', `${(column + between(.15, .85)) / columns * 100}%`);
      particle.style.setProperty('--particle-color', pick(COLORS));
      particle.style.setProperty('--particle-drift', `${between(-45, 45)}px`);
      particle.style.setProperty('--particle-turn', `${between(-80, 80)}deg`);
      particle.style.setProperty('--particle-delay', `${Math.round(between(0, effect === 'stars' ? 240 : 120))}ms`);
      if (effect === 'confetti') {
        particle.style.setProperty('--particle-y', `${Math.floor(index / 8) * 15 + between(-8, 8)}%`);
        particle.style.setProperty('--particle-size', `${between(13, 23)}px`);
        particle.style.setProperty('--particle-spin', `${between(180, 520)}deg`);
        particle.classList.toggle('is-ribbon', index % 3 === 0);
      } else if (effect === 'balloons') {
        particle.style.setProperty('--particle-y', `${Math.floor(index / 6) * 38 + between(48, 74)}%`);
        particle.style.setProperty('--particle-size', `${between(55, 84)}px`);
        particle.innerHTML = balloonShape;
      } else {
        particle.style.setProperty('--particle-y', `${Math.floor(index / 8) * 24 + between(8, 20)}%`);
        particle.style.setProperty('--particle-size', `${between(32, 56)}px`);
        particle.innerHTML = starShape;
      }
      container.append(particle);
    }
  }

  function show(kind, animalName = '') {
    if (kind !== 'correct' && kind !== 'wrong') throw new Error('Unknown answer feedback kind.');
    clear();
    const correct = kind === 'correct';
    const effect = correct ? pick(EFFECTS.filter((item) => item !== previousEffect)) : 'retry';
    if (correct) previousEffect = effect;
    layer.dataset.kind = kind;
    layer.dataset.effect = effect;
    layer.innerHTML = `<div class="feedback-border"></div>
      <div class="feedback-particles feedback-sparkles"></div>
      <div class="feedback-emblem feedback-banner">
        <span class="feedback-character">${correct ? happyStar : kindCloud}</span>
        <span class="feedback-result">${correct ? check : retry}</span>
        <span class="feedback-copy"><strong></strong><small></small></span>
      </div>`;
    // Spoken/live status belongs to the host. These labels are secondary to the
    // large happy/check and red cross pictures; reading is never required.
    layer.querySelector('strong').textContent = correct ? 'آفریییین!' : 'اوپس! این نبود';
    layer.querySelector('small').textContent = correct ? `${animalName ? `صدای ${animalName} بود! ` : ''}چه خوب پیداش کردی!` : animalName ? 'دوباره گوش کنیم؟' : 'دوباره نگاه کنیم؟';
    if (correct && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      addParticles(effect, layer.querySelector('.feedback-particles'));
    }
    canvas.dataset.feedback = kind;
    layer.hidden = false;
  }

  return { show, clear };
}
