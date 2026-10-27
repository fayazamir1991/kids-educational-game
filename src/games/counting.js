import './count-sizes.css';

const countWords = ['صفر', 'یک', 'دو', 'سه'];
const carrot = (className = '') => `<svg class="count-carrot ${className}" viewBox="0 0 80 120" fill="none" aria-hidden="true"><path d="M36 34C13-2 8 13 29 39M41 31C30-7 53-6 46 33M46 36C68 6 74 22 52 43" stroke="#86AD69" stroke-width="8" stroke-linecap="round"/><path d="M24 40c12-14 36-6 37 6 2 17-16 60-26 68-10-10-24-50-23-62 0-4 5-9 12-12Z" fill="#F4A44D"/><path d="M25 43c4-4 10-4 14-2-6 10-3 43 1 59-11-14-23-46-15-57Z" fill="#FFC476"/><path d="m41 54 13 4M20 66l14 4m3 12 10 3" stroke="#DF873D" stroke-width="3" stroke-linecap="round"/></svg>`;

const bunny = `<svg class="count-bunny-svg" viewBox="0 0 260 245" fill="none" aria-hidden="true"><defs><radialGradient id="count-bunny-coat" cx=".35" cy=".2" r=".95"><stop stop-color="#FFFDF3"/><stop offset="1" stop-color="#E9DBBE"/></radialGradient></defs><ellipse cx="133" cy="231" rx="80" ry="9" fill="#8B9161" opacity=".13"/><path d="M77 100C50 58 55 3 74 3c21 0 35 58 28 96M157 95c-3-50 14-91 33-89 23 4 17 62-9 101" fill="url(#count-bunny-coat)" stroke="#E1CEAD" stroke-width="2"/><path d="M78 82C67 47 68 20 75 19c10 1 17 33 16 60m77 4c1-34 13-60 20-59 9 3 2 32-10 61" fill="#EDB5AB"/><ellipse cx="131" cy="184" rx="69" ry="49" fill="url(#count-bunny-coat)"/><ellipse cx="131" cy="197" rx="38" ry="28" fill="#FFF9E8"/><ellipse cx="130" cy="130" rx="81" ry="65" fill="url(#count-bunny-coat)"/><ellipse cx="93" cy="126" rx="7" ry="10" fill="#584638"/><ellipse cx="166" cy="126" rx="7" ry="10" fill="#584638"/><circle cx="91" cy="123" r="2" fill="#FFFBEA"/><circle cx="164" cy="123" r="2" fill="#FFFBEA"/><ellipse cx="76" cy="146" rx="14" ry="8" fill="#ECAF9C" opacity=".7"/><ellipse cx="185" cy="146" rx="14" ry="8" fill="#ECAF9C" opacity=".7"/><path d="M120 142q10-9 20 0-1 12-10 12-9-1-10-12Z" fill="#D29582"/><path class="count-bunny-mouth" d="M130 153v7m0 0q-10 12-20 1m20-1q10 12 20 1" stroke="#9E7D60" stroke-width="3" stroke-linecap="round"/><path d="m55 144-21-3m22 13-24 4m172-14 21-3m-22 13 24 4" stroke="#C9B18D" stroke-width="2" stroke-linecap="round"/><ellipse cx="87" cy="219" rx="27" ry="15" fill="#FFF5E1"/><ellipse cx="173" cy="219" rx="27" ry="15" fill="#FFF5E1"/><path d="M73 181q-19 12-13 26 8 10 29-7m98-19q19 12 13 26-8 10-29-7" fill="#F2E4C9" stroke="#E4D2B1" stroke-width="2"/><g class="count-bunny-snack"><path d="m109 177 24 35 20-34c-9-9-30-9-44-1Z" fill="#F3A24B"/><path d="m124 177-10-16m17 15 4-18m5 20 14-15" stroke="#88AD68" stroke-width="6" stroke-linecap="round"/></g></svg>`;

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createCountingGame({ mount, submit, setPrompt, random = Math.random }) {
  let disabled = false;
  let target = 1;
  let plan = [];
  const selected = new Set();
  mount.innerHTML = `<div class="count-game" data-target-count="1">
    <div class="count-tray-area"><span class="count-area-caption">هویج انتخاب کن</span><div class="count-tray">${[0, 1, 2].map((index) => `<button class="count-pick mini-option" data-carrot="${index}" aria-label="هویج ${['اول', 'دوم', 'سوم'][index]}" aria-pressed="false"><span class="animal-art">${carrot()}</span><span class="count-pick-check" aria-hidden="true">✓</span></button>`).join('')}</div><span class="count-tray-line" aria-hidden="true"></span></div>
    <div class="count-order"><div class="count-goal" aria-label="تعداد هویج خواسته‌شده"><span class="count-goal-caption">این‌قدر می‌خوام!</span><div class="count-goal-carrots"></div></div><span class="count-order-arrow" aria-hidden="true">↓</span><div class="count-plate"><div class="count-plate-items" aria-hidden="true"></div><span class="count-plate-empty" aria-hidden="true">···</span></div><span class="count-selection-status" role="status" aria-live="polite"></span></div>
    <button class="count-feed mini-option" data-action="feed" aria-label="به خرگوش غذا بده"><span class="animal-art count-rabbit-art"><span class="animal-halo"></span>${bunny}</span><span class="count-feed-label"><span aria-hidden="true">♡</span>بده به خرگوش</span></button>
  </div>`;
  const board = mount.querySelector('.count-game');
  const picks = [...board.querySelectorAll('[data-carrot]')];
  const feed = board.querySelector('.count-feed');
  const prompt = () => `${countWords[target]} هویج به خرگوش بده!`;

  function updateSelection() {
    picks.forEach((button) => button.setAttribute('aria-pressed', String(selected.has(Number(button.dataset.carrot)))));
    board.querySelector('.count-plate-items').innerHTML = [...selected].map(() => carrot()).join('');
    board.querySelector('.count-plate-empty').hidden = selected.size > 0;
    board.querySelector('.count-selection-status').textContent = `${countWords[selected.size]} هویج در بشقاب`;
    feed.setAttribute('data-count', String(selected.size));
  }

  function onClick(event) {
    if (disabled) return;
    const pick = event.target.closest('[data-carrot]');
    if (pick && board.contains(pick)) {
      board.classList.remove('is-hinting');
      const index = Number(pick.dataset.carrot);
      if (selected.has(index)) selected.delete(index);
      else selected.add(index);
      updateSelection();
      setPrompt(prompt());
      return;
    }
    if (!event.target.closest('[data-action="feed"]')) return;
    if (selected.size === 0) {
      setPrompt('اول هویج‌ها رو انتخاب کن، بعد به خرگوش بده!');
      hint();
      return;
    }
    const correct = selected.size === target;
    if (submit(correct, feed, 'آفرین! خرگوش به اندازهٔ درست هویج گرفت!') && correct) {
      board.classList.add('is-fed');
    }
  }

  function startRound(index) {
    if (index === 0 || !plan.length) plan = shuffle([1, 2, 3, 1 + Math.floor(random() * 3), 1 + Math.floor(random() * 3)], random);
    target = plan[index % plan.length];
    board.dataset.targetCount = String(target);
    board.querySelector('.count-goal').setAttribute('aria-label', `${countWords[target]} هویج می‌خوام`);
    board.querySelector('.count-goal-carrots').innerHTML = Array.from({ length: target }, () => carrot()).join('');
    retry();
    setPrompt(prompt());
  }

  function setDisabled(value) {
    disabled = value;
    [...picks, feed].forEach((button) => { button.disabled = value; });
  }

  function retry() {
    selected.clear();
    board.classList.remove('is-fed', 'is-hinting');
    updateSelection();
    setPrompt(prompt());
  }

  function hint() {
    board.classList.remove('is-hinting');
    void board.offsetWidth;
    board.classList.add('is-hinting');
  }

  board.addEventListener('click', onClick);
  return { roundCount: 5, startRound, setDisabled, retry, hint, destroy() { board.removeEventListener('click', onClick); mount.replaceChildren(); } };
}
