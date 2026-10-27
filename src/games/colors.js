import './colors-shapes.css';

const COLORS = [
  { id: 'red', name: 'قرمز', fill: '#ed7d6b', light: '#ffd3b9', dark: '#cd5e51' },
  { id: 'yellow', name: 'زرد', fill: '#efc75d', light: '#fff0af', dark: '#d6a847' },
  { id: 'blue', name: 'آبی', fill: '#83afd6', light: '#c7e7f7', dark: '#658ebd' },
];
let artworkId = 0;

function shuffled(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sequence(random) {
  const result = shuffled(COLORS, random);
  while (result.length < 5) {
    const next = COLORS.filter((item) => item.id !== result.at(-1).id);
    result.push(next[Math.floor(random() * next.length)]);
  }
  return result;
}

function fruit(color) {
  const id = `color-fruit-${++artworkId}`;
  const face = '<ellipse cx="72" cy="107" rx="4.5" ry="6" fill="#5a4a43"/><ellipse cx="108" cy="107" rx="4.5" ry="6" fill="#5a4a43"/><circle cx="73" cy="105" r="1.2" fill="#fff"/><circle cx="109" cy="105" r="1.2" fill="#fff"/><path d="M81 120q9 10 18 0" stroke="#906351" stroke-width="3" stroke-linecap="round" fill="none"/><ellipse cx="61" cy="118" rx="9" ry="4.5" fill="#e9a08b" opacity=".6"/><ellipse cx="119" cy="118" rx="9" ry="4.5" fill="#e9a08b" opacity=".6"/>';
  const body = color.id === 'red'
    ? '<path d="M38 66c12-12 37-15 52-7 17-8 42-5 53 7 23 26-6 84-43 98-6 3-14 3-20 0-37-15-66-72-42-98Z" fill="url(#'+id+')"/><path d="m54 82 3 7m24-14 2 7m31 0 2 7m17 12 1 7m-78 6 3 6m17 17 2 6m36-5 2 6" stroke="#ffe7aa" stroke-width="4" stroke-linecap="round" opacity=".78"/><path d="m89 58-23-6 13-13-3-15 18 13 16-13 1 17 18 9-26 11" fill="#9ab77d"/><path d="M93 39c-3-11 0-19 7-23" stroke="#8d9060" stroke-width="6" stroke-linecap="round"/> '
    : color.id === 'yellow'
      ? '<path d="M91 34c-25 0-22 27-35 47-10 14-24 28-24 46 0 28 23 42 58 42s58-14 58-42c0-18-14-32-24-46-13-20-10-47-33-47Z" fill="url(#'+id+')"/><path d="M53 107c-7 12-7 25 0 34" stroke="#fff3bb" stroke-width="9" stroke-linecap="round" opacity=".75"/><path d="M91 35c0-12 2-22 10-29" stroke="#a38c61" stroke-width="7" stroke-linecap="round"/><path d="M99 24c10-17 30-17 37-10-7 16-25 24-37 10Z" fill="#a3bb80"/>'
      : '<circle cx="65" cy="83" r="39" fill="url(#'+id+')"/><circle cx="116" cy="83" r="39" fill="url(#'+id+')"/><circle cx="90" cy="121" r="47" fill="url(#'+id+')"/><path d="m62 50 6 8 10-1-7 8 2 10-10-5-9 5 1-10-7-7 10 0Z" fill="#7097c2"/><path d="m117 49 6 8 10-1-7 8 2 10-10-5-9 5 1-10-7-7 10 0Z" fill="#7097c2"/><path d="M59 96c-8 4-13 10-16 18" stroke="#d9effc" stroke-width="8" stroke-linecap="round" opacity=".8"/>';
  return `<svg viewBox="0 0 180 180" fill="none" aria-hidden="true"><defs><radialGradient id="${id}" cx=".35" cy=".25" r=".9"><stop stop-color="${color.light}"/><stop offset=".58" stop-color="${color.fill}"/><stop offset="1" stop-color="${color.dark}"/></radialGradient></defs><ellipse cx="90" cy="170" rx="47" ry="6" fill="#866d3c" opacity=".12"/>${body}${face}</svg>`;
}

function basket(color) {
  const id = `color-basket-${++artworkId}`;
  return `<svg viewBox="0 0 170 138" fill="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="30" y1="25" x2="130" y2="138" gradientUnits="userSpaceOnUse"><stop stop-color="#f9df9f"/><stop offset="1" stop-color="#d9ae6e"/></linearGradient></defs><ellipse cx="85" cy="129" rx="58" ry="7" fill="#816b45" opacity=".13"/><path d="m19 35 12 76c2 14 24 20 54 20s52-6 54-20l12-76" fill="url(#${id})"/><path d="m42 44 5 75m22-71 1 79m29-79-1 79m29-83-5 75" stroke="#bf9259" stroke-width="3" opacity=".45"/><path d="M26 66q58 17 119 0M29 88q55 17 112 0M32 109q53 16 106 0" stroke="#fff1c8" stroke-width="5" opacity=".66"/><ellipse cx="85" cy="35" rx="67" ry="23" fill="${color.dark}"/><ellipse cx="85" cy="32" rx="67" ry="22" fill="${color.fill}"/><ellipse cx="85" cy="32" rx="55" ry="12" fill="#896747"/><path d="M27 28c9-10 29-15 53-16" stroke="${color.light}" stroke-width="6" stroke-linecap="round" opacity=".7"/><circle cx="85" cy="87" r="24" fill="#fff6dc"/><circle cx="85" cy="86" r="18" fill="${color.fill}"/></svg>`;
}

/** Match a visible fruit to its basket; both taps and pointer dragging work. */
export function createColorsGame({ mount, submit, setPrompt, random = Math.random }) {
  let disabled = true;
  let target;
  let rounds = sequence(random);
  let drag = null;
  let suppressClick = false;
  const events = new AbortController();
  const board = document.createElement('div');
  board.className = 'colorgame';
  mount.append(board);

  function pickup() {
    board.classList.add('has-picked');
    board.querySelector('.cs-fruit')?.setAttribute('aria-pressed', 'true');
  }

  function attempt(button) {
    if (disabled || !button) return;
    const correct = button.dataset.dropColor === target.id;
    if (submit(correct, button, `آفرین! رنگ ${target.name} رو پیدا کردی!`) && correct) {
      board.classList.add('has-delivered');
      button.querySelector('.cs-delivered-fruit').innerHTML = fruit(target);
    }
  }

  function clearDrag() {
    if (drag?.piece) {
      drag.piece.classList.remove('is-dragging');
      drag.piece.style.removeProperty('--drag-x');
      drag.piece.style.removeProperty('--drag-y');
      try { drag.piece.releasePointerCapture(drag.id); } catch { /* Already released. */ }
    }
    board.querySelectorAll('.is-over').forEach((element) => element.classList.remove('is-over'));
    drag = null;
  }

  function hitBasket(event) {
    const piece = drag?.piece;
    if (piece) piece.style.pointerEvents = 'none';
    const button = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-color]');
    if (piece) piece.style.removeProperty('pointer-events');
    return button && board.contains(button) ? button : null;
  }

  board.addEventListener('click', (event) => {
    if (disabled) return;
    const basketButton = event.target.closest('[data-drop-color]');
    if (basketButton) return attempt(basketButton);
    if (event.target.closest('.cs-fruit')) {
      if (suppressClick) { suppressClick = false; return; }
      pickup();
    }
  }, { signal: events.signal });
  board.addEventListener('pointerdown', (event) => {
    const piece = event.target.closest('.cs-fruit');
    if (disabled || !piece || !event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    pickup();
    drag = { piece, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    try { piece.setPointerCapture(event.pointerId); } catch { /* Tap matching remains available. */ }
  }, { signal: events.signal });
  board.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId || disabled) return;
    const x = event.clientX - drag.x;
    const y = event.clientY - drag.y;
    drag.moved ||= Math.hypot(x, y) > 9;
    if (!drag.moved) return;
    event.preventDefault();
    drag.piece.classList.add('is-dragging');
    drag.piece.style.setProperty('--drag-x', `${x}px`);
    drag.piece.style.setProperty('--drag-y', `${y}px`);
    board.querySelectorAll('.is-over').forEach((element) => element.classList.remove('is-over'));
    hitBasket(event)?.classList.add('is-over');
  }, { signal: events.signal });
  board.addEventListener('pointerup', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const moved = drag.moved;
    const button = moved ? hitBasket(event) : null;
    clearDrag();
    if (moved) { suppressClick = true; attempt(button); }
  }, { signal: events.signal });
  board.addEventListener('pointercancel', clearDrag, { signal: events.signal });

  function setDisabled(value) {
    disabled = value;
    board.querySelectorAll('button').forEach((button) => { button.disabled = value; });
    if (value) clearDrag();
  }

  return {
    roundCount: 5,
    startRound(index) {
      clearDrag();
      if (index === 0) rounds = sequence(random);
      target = rounds[index % rounds.length];
      board.className = 'colorgame';
      board.innerHTML = `<div class="cs-fruit-zone"><button class="cs-fruit" data-color="${target.id}" aria-label="میوهٔ ${target.name}، بردار و در سبد هم‌رنگ بگذار" aria-pressed="false"><span class="cs-fruit-art">${fruit(target)}</span></button><span class="cs-pickup-label">میوه رو بردار</span></div><span class="cs-match-arrow" aria-hidden="true"><svg viewBox="0 0 46 35" fill="none"><path d="M4 18h31m-9-9 9 9-9 9" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 7"/></svg></span><div class="cs-baskets">${shuffled(COLORS, random).map((color) => `<button class="mini-option cs-basket" data-value="${color.id}" data-drop-color="${color.id}" aria-label="سبد ${color.name}"><span class="animal-art cs-basket-art">${basket(color)}<span class="cs-delivered-fruit"></span></span><span class="cs-color-name">${color.name}</span></button>`).join('')}</div>`;
      setPrompt('میوه رو توی سبد هم‌رنگ خودش بذار!');
      setDisabled(false);
    },
    setDisabled,
    retry() {
      clearDrag();
      board.classList.remove('has-picked', 'hinting');
      board.querySelector('.cs-fruit')?.setAttribute('aria-pressed', 'false');
    },
    hint() { pickup(); board.classList.add('hinting'); },
    destroy() { clearDrag(); events.abort(); board.remove(); },
  };
}
