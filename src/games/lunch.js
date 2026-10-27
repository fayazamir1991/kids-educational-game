import { asset } from '../assets.js';
import './lunch.css';

const FRIENDS = [
  { id: 'cow', name: 'گاو' }, { id: 'sheep', name: 'گوسفند' },
  { id: 'duck', name: 'اردک' }, { id: 'cat', name: 'گربه' },
  { id: 'dog', name: 'سگ' }, { id: 'lion', name: 'شیر' },
];
const FRUITS = [
  { id: 'apple', name: 'سیب' },
  { id: 'pear', name: 'گلابی' },
  { id: 'berry', name: 'توت‌فرنگی' },
];

function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

function fruitArt(kind) {
  const body = kind === 'pear'
    ? '<path d="M51 18c-15 0-13 18-21 30C10 76 24 94 50 94s41-18 21-46C64 36 66 18 51 18Z" fill="#E8C65C"/><path d="M34 52c-7 11-7 19-2 26" stroke="#FFF0B0" stroke-width="8" stroke-linecap="round"/>'
    : kind === 'berry'
      ? '<path d="M21 34c9-9 20-9 29-4 10-5 23-5 31 4 14 17-8 50-27 61-3 2-6 2-9 0C25 84 7 50 21 34Z" fill="#E88A78"/><path d="m50 31-21-7 12-9 9 7 11-8 10 9Z" fill="#8CAA72"/><path d="m28 47 2 4m20-10 1 5m20 2-2 5M37 69l2 4m20-4-2 4m-8 11 1 4" stroke="#FFECC0" stroke-width="3" stroke-linecap="round"/>'
      : '<path d="M49 29C30 13 12 33 16 56c4 27 21 42 34 34 14 8 31-8 35-34 4-23-16-42-35-27Z" fill="#E88C78"/><path d="M29 37c-6 6-7 15-5 21" stroke="#FFC4AD" stroke-width="8" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 100 105" fill="none" aria-hidden="true"><ellipse cx="50" cy="97" rx="27" ry="4" fill="#8A794B" opacity=".11"/><path d="M50 30c-3-10-1-17 4-22" stroke="#9E825B" stroke-width="5" stroke-linecap="round"/><path d="M53 19c7-13 22-14 27-6-6 11-18 15-27 6Z" fill="#8FAE72"/>${body}<ellipse cx="39" cy="56" rx="3" ry="4" fill="#80654C"/><ellipse cx="62" cy="56" rx="3" ry="4" fill="#80654C"/><path d="M45 66q6 6 12 0" stroke="#A77459" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="31" cy="64" rx="5" ry="2.5" fill="#E5A08A" opacity=".65"/><ellipse cx="70" cy="64" rx="5" ry="2.5" fill="#E5A08A" opacity=".65"/></svg>`;
}

const check = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const arrow = '<svg viewBox="0 0 54 28" fill="none" aria-hidden="true"><path d="M5 14h40m-10-9 10 9-10 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 6"/></svg>';

/** One fruit for each friend. Placements persist through three host rounds. */
export function createLunchGame({ mount, submit, setPrompt, random = Math.random }) {
  let friends = [];
  let fruit = FRUITS[0];
  let previousFruit = '';
  let selected = null;
  let fed = new Map();
  let delivered = new Set();
  let disabled = true;
  let destroyed = false;
  let dragging = null;
  let ghost = null;
  let suppressClick = false;
  const events = new AbortController();
  const board = document.createElement('div');
  board.className = 'lunch-game';
  mount.append(board);

  function cancelDrag() {
    if (dragging) {
      try { dragging.button.releasePointerCapture(dragging.pointerId); } catch { /* Already released. */ }
    }
    dragging = null;
    ghost?.remove();
    ghost = null;
    board.querySelectorAll('.is-over').forEach((element) => element.classList.remove('is-over'));
  }

  function refresh() {
    if (destroyed) return;
    board.dataset.fedCount = String(fed.size);
    board.classList.toggle('has-selection', selected !== null);
    for (const button of board.querySelectorAll('[data-lunch-fruit]')) {
      const index = Number(button.dataset.lunchFruit);
      const used = delivered.has(index);
      button.dataset.delivered = String(used);
      button.disabled = disabled || used;
      button.setAttribute('aria-pressed', String(selected === index && !used));
      button.classList.toggle('is-selected', selected === index && !used);
    }
    for (const button of board.querySelectorAll('[data-lunch-friend]')) {
      const id = button.dataset.lunchFriend;
      const full = fed.has(id);
      button.dataset.fed = String(full);
      // Filled plates stay selectable: giving a second fruit is a retry.
      button.disabled = disabled;
      button.classList.toggle('is-fed', full);
      const friend = friends.find((item) => item.id === id);
      button.setAttribute('aria-label', full ? `بشقاب ${friend.name} یک ${fruit.name} دارد` : `یک ${fruit.name} برای ${friend.name} بگذار`);
      const serving = button.querySelector('.lunch-served-fruit');
      if (full && !serving.firstChild) serving.innerHTML = fruitArt(fruit.id);
      if (!full) serving.replaceChildren();
    }
    board.querySelector('.lunch-inventory').textContent = `${(3 - delivered.size).toLocaleString('fa-IR')} میوه در سبد`;
    board.querySelector('.lunch-progress-label').textContent = `${fed.size.toLocaleString('fa-IR')} دوست از ۳ دوست`;
  }

  function draw() {
    board.innerHTML = `<div class="lunch-source">
      <div class="lunch-rule" aria-label="برای هر دوست، فقط یک میوه"><span class="lunch-rule-fruit">${fruitArt(fruit.id)}</span><span class="lunch-rule-arrow">${arrow}</span><span class="lunch-rule-plate"><span>${fruitArt(fruit.id)}</span></span></div>
      <div class="lunch-basket" role="group" aria-label="میوه‌ها؛ یکی را بردار و به یک دوست بده">
        <div class="lunch-basket-weave" aria-hidden="true"></div>
        <div class="lunch-fruits">${[0, 1, 2].map((index) => `<button class="lunch-fruit mini-option" data-lunch-fruit="${index}" data-delivered="false" aria-pressed="false" aria-label="${fruit.name} ${['اول', 'دوم', 'سوم'][index]}"><span class="lunch-fruit-art">${fruitArt(fruit.id)}</span><span class="lunch-fruit-check">${check}</span></button>`).join('')}</div>
      </div><span class="lunch-inventory" role="status" aria-live="polite"></span>
    </div>
    <span class="lunch-direction" aria-hidden="true">${arrow}</span>
    <div class="lunch-friends" role="group" aria-label="سه دوست؛ برای هر بشقاب یک میوه">
      ${friends.map((friend) => `<button class="lunch-friend mini-option" data-lunch-friend="${friend.id}" data-fed="false"><span class="lunch-friend-art animal-art"><span class="animal-halo"></span><img src="${asset(`/art/${friend.id}.svg`)}" alt="" draggable="false" /></span><span class="lunch-plate"><span class="lunch-empty-fruit" aria-hidden="true">${fruitArt(fruit.id)}</span><span class="lunch-served-fruit" aria-hidden="true"></span><span class="lunch-plate-check" aria-hidden="true">${check}</span></span><span class="lunch-friend-name">${friend.name}</span></button>`).join('')}
      <span class="lunch-progress-label" aria-live="polite"></span>
    </div>`;
    refresh();
  }

  function selectFruit(index) {
    if (destroyed || disabled || delivered.has(index)) return;
    selected = index;
    board.classList.remove('is-hinting');
    refresh();
    setPrompt('برای هر دوست، یک میوه توی بشقابش بذار!');
  }

  function serve(id) {
    if (destroyed || disabled || !friends.some((friend) => friend.id === id)) return;
    if (selected === null) {
      setPrompt('اول یک میوه بردار، بعد بشقاب دوستت رو لمس کن!');
      hint();
      return;
    }
    const correct = !fed.has(id);
    const button = board.querySelector(`[data-lunch-friend="${id}"]`);
    const serving = selected;
    if (!submit(correct, button, 'آفرین! یک میوه برای یک دوست!')) return;
    if (correct) {
      fed.set(id, serving);
      delivered.add(serving);
      selected = null;
      refresh();
    }
  }

  board.addEventListener('click', (event) => {
    if (disabled || destroyed) return;
    if (suppressClick) { suppressClick = false; return; }
    const source = event.target.closest('[data-lunch-fruit]');
    if (source && board.contains(source)) { selectFruit(Number(source.dataset.lunchFruit)); return; }
    const friend = event.target.closest('[data-lunch-friend]');
    if (friend && board.contains(friend)) serve(friend.dataset.lunchFriend);
  }, { signal: events.signal });

  board.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('[data-lunch-fruit]');
    if (!button || !board.contains(button) || disabled || destroyed || delivered.has(Number(button.dataset.lunchFruit)) || !event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    selectFruit(Number(button.dataset.lunchFruit));
    dragging = { button, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    try { button.setPointerCapture(event.pointerId); } catch { /* Tap-to-place still works. */ }
  }, { signal: events.signal });

  board.addEventListener('pointermove', (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId || disabled) return;
    if (!dragging.moved && Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) < 8) return;
    dragging.moved = true;
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.className = 'lunch-drag-preview';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.innerHTML = fruitArt(fruit.id);
      mount.append(ghost);
    }
    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;
    board.querySelectorAll('.is-over').forEach((element) => element.classList.remove('is-over'));
    const friend = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-lunch-friend]');
    if (friend && board.contains(friend)) friend.classList.add('is-over');
  }, { signal: events.signal });

  board.addEventListener('pointerup', (event) => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    const moved = dragging.moved;
    const friend = moved ? document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-lunch-friend]') : null;
    cancelDrag();
    if (moved) {
      suppressClick = true;
      if (friend && board.contains(friend)) serve(friend.dataset.lunchFriend);
    }
  }, { signal: events.signal });
  board.addEventListener('pointercancel', cancelDrag, { signal: events.signal });

  function hint() {
    board.classList.remove('is-hinting');
    void board.offsetWidth;
    board.classList.add('is-hinting');
  }

  return {
    roundCount: 3,
    startRound(index) {
      if (destroyed) return;
      cancelDrag();
      selected = null;
      suppressClick = false;
      if (index === 0 || !friends.length) {
        friends = shuffled(FRIENDS, random).slice(0, 3);
        const candidates = FRUITS.filter((item) => item.id !== previousFruit);
        fruit = candidates[Math.floor(random() * candidates.length)];
        previousFruit = fruit.id;
        fed = new Map();
        delivered = new Set();
        board.className = 'lunch-game';
        draw();
      } else {
        board.classList.remove('is-hinting');
        refresh();
      }
      setPrompt('یک میوه برای هر دوست؛ کسی جا نمونه!');
    },
    setDisabled(value) {
      disabled = Boolean(value);
      if (disabled) cancelDrag();
      refresh();
    },
    retry() {
      if (destroyed) return;
      cancelDrag();
      selected = null;
      suppressClick = false;
      board.classList.remove('is-hinting');
      refresh();
      setPrompt('این دوست میوه داره؛ یک دوست با بشقاب خالی پیدا کن!');
      hint();
    },
    hint,
    destroy() {
      destroyed = true;
      cancelDrag();
      events.abort();
      board.remove();
    },
  };
}
