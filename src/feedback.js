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

/** Visual response only. The game owns timing, accessible announcements and sound. */
export function createFeedback(stage, { id = 'answer-feedback' } = {}) {
  if (!stage) throw new Error('Answer feedback needs an animal stage.');
  const canvas = stage.closest('.game-canvas');
  const layer = document.createElement('div');
  layer.id = id;
  layer.className = 'answer-feedback';
  layer.hidden = true;
  layer.setAttribute('aria-hidden', 'true');
  stage.append(layer);

  function clear() {
    layer.hidden = true;
    layer.className = 'answer-feedback';
    layer.removeAttribute('data-kind');
    layer.replaceChildren();
    if (canvas) delete canvas.dataset.feedback;
  }

  function show(kind, animalName = '') {
    if (kind !== 'correct' && kind !== 'wrong') throw new Error('Unknown answer feedback kind.');
    clear();
    const correct = kind === 'correct';
    layer.dataset.kind = kind;
    layer.innerHTML = `<div class="feedback-banner">
      <span class="feedback-character">${correct ? happyStar : kindCloud}</span>
      <span class="feedback-copy"><strong></strong><small></small></span>
      <span class="feedback-result">${correct ? check : retry}</span>
    </div><div class="feedback-sparkles"></div>`;
    layer.querySelector('strong').textContent = correct ? 'آفریییین!' : 'اوپس! این نبود';
    layer.querySelector('small').textContent = correct ? `${animalName ? `صدای ${animalName} بود! ` : ''}چه خوب پیداش کردی!` : animalName ? 'دوباره گوش کنیم؟' : 'دوباره نگاه کنیم؟';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles = layer.querySelector('.feedback-sparkles');
    if (correct && !reducedMotion) {
      for (let index = 0; index < 12; index++) {
        const spark = document.createElement('span');
        spark.className = 'feedback-spark';
        spark.textContent = index % 3 === 0 ? '✦' : '✧';
        const angle = index / 12 * Math.PI * 2;
        spark.style.setProperty('--spark-x', `${Math.cos(angle) * (70 + index % 3 * 23)}px`);
        spark.style.setProperty('--spark-y', `${Math.sin(angle) * (35 + index % 3 * 14)}px`);
        spark.style.setProperty('--spark-delay', `${index % 4 * 0.07}s`);
        spark.style.setProperty('--spark-color', ['#D6AB4B', '#B08ABF', '#8EAE76'][index % 3]);
        particles.append(spark);
      }
    }
    // Replacing the banner above gives each repeated response a fresh animation.
    if (canvas) canvas.dataset.feedback = kind;
    layer.hidden = false;
  }

  return { show, clear };
}
