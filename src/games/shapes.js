import './colors-shapes.css';

const SHAPES = [
  { id: 'circle', name: 'دایره' },
  { id: 'square', name: 'مربع' },
  { id: 'triangle', name: 'مثلث' },
];
// Every shape uses the same material in a round. Color cannot reveal the answer.
const MATERIALS = [
  { id: 'sand', fill: '#dec59e', light: '#fff0cf', dark: '#b69a72', hole: '#a38c70' },
  { id: 'sage', fill: '#c6d1b3', light: '#edf0dc', dark: '#9aa886', hole: '#889577' },
  { id: 'clay', fill: '#d8c3ba', light: '#f6e6dc', dark: '#b29a90', hole: '#a18b80' },
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
  const values = shuffled(SHAPES, random);
  while (values.length < 5) {
    const choices = SHAPES.filter((shape) => shape.id !== values.at(-1).id);
    values.push(choices[Math.floor(random() * choices.length)]);
  }
  return values;
}

function shapeSVG(shape, material, empty = false, rotation = 0) {
  const id = `shape-piece-${++artworkId}`;
  const geometry = shape.id === 'circle'
    ? '<circle cx="65" cy="62" r="45"'
    : shape.id === 'square'
      ? '<rect x="21" y="18" width="88" height="88" rx="10"'
      : '<path d="m65 13 49 87c3 5 0 10-6 10H22c-6 0-9-5-6-10Z"';
  const fill = empty ? material.hole : `url(#${id})`;
  const stroke = material.dark;
  const shine = shape.id === 'circle' ? '<path d="M35 44c4-10 13-17 22-18"/>' : shape.id === 'square' ? '<path d="M34 45V33h30"/>' : '<path d="m42 72 21-37"/>';
  return `<svg viewBox="0 0 130 130" fill="none" data-material="${material.id}" data-rotation="${rotation}" aria-hidden="true"><defs><linearGradient id="${id}" x1="20" y1="12" x2="100" y2="115" gradientUnits="userSpaceOnUse"><stop stop-color="${material.light}"/><stop offset=".65" stop-color="${material.fill}"/><stop offset="1" stop-color="${material.dark}"/></linearGradient></defs><g class="sg-geometry" transform="rotate(${rotation} 65 65)">${geometry} fill="${fill}" stroke="${stroke}" stroke-width="3"/>${empty ? '' : `<g stroke="#fff7df" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".58">${shine}</g>`}</g></svg>`;
}

function toyHouse() {
  const id = `shape-house-${++artworkId}`;
  return `<svg class="sg-house-picture" viewBox="0 0 520 240" fill="none" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="90" y1="67" x2="440" y2="233" gradientUnits="userSpaceOnUse"><stop stop-color="#f9e6bd"/><stop offset="1" stop-color="#dfc395"/></linearGradient></defs><path d="M401 25h43v64h-43Z" fill="#d18e78"/><path d="M400 22h46v13h-46Z" fill="#e2aa90"/><rect x="44" y="74" width="432" height="156" rx="17" fill="url(#${id})" stroke="#c9aa7d" stroke-width="3"/><path d="M61 96h397M61 219h397M72 106v99M448 106v99" stroke="#fff6dc" stroke-width="4" stroke-linecap="round" opacity=".48"/><path d="M23 83 249 10c8-3 15-3 22 0l226 73c9 3 11 12 4 17-3 3-8 3-13 2L260 29 34 102c-6 2-12 1-16-3-6-6-3-13 5-16Z" fill="#e5a18a" stroke="#d38a75" stroke-width="3"/><path d="m30 84 229-73 230 73" stroke="#f6c3a8" stroke-width="5" stroke-linecap="round"/><path d="M204 60c16 8 37 11 58 11s41-3 56-11" stroke="#b99868" stroke-width="3" stroke-linecap="round" opacity=".2"/><ellipse cx="260" cy="234" rx="206" ry="5" fill="#93794f" opacity=".13"/></svg>`;
}

/** Fit a chunky visible block into a matching hole in the toy house. */
export function createShapesGame({ mount, submit, setPrompt, random = Math.random }) {
  let target;
  let material = MATERIALS[0];
  let rotation = 0;
  let rounds = sequence(random);
  let disabled = true;
  let drag = null;
  let suppressClick = false;
  const events = new AbortController();
  const board = document.createElement('div');
  board.className = 'shape-game';
  mount.append(board);

  function pickup() {
    board.classList.add('has-picked');
    board.querySelector('.sg-piece')?.setAttribute('aria-pressed', 'true');
  }

  function attempt(button) {
    if (!button || disabled) return;
    const correct = button.dataset.dropShape === target.id;
    if (submit(correct, button, `آفرین! ${target.name} رو سر جاش گذاشتی!`) && correct) {
      board.classList.add('has-delivered');
      // A rotated piece still belongs in the same-shaped opening.
      button.querySelector('.sg-slot-art').innerHTML = shapeSVG(target, material);
      button.classList.add('is-filled');
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

  function hitSlot(event) {
    const piece = drag?.piece;
    if (piece) piece.style.pointerEvents = 'none';
    const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-shape]');
    if (piece) piece.style.removeProperty('pointer-events');
    return slot && board.contains(slot) ? slot : null;
  }

  board.addEventListener('click', (event) => {
    if (disabled) return;
    const slot = event.target.closest('[data-drop-shape]');
    if (slot) return attempt(slot);
    if (event.target.closest('.sg-piece')) {
      if (suppressClick) { suppressClick = false; return; }
      pickup();
    }
  }, { signal: events.signal });
  board.addEventListener('pointerdown', (event) => {
    const piece = event.target.closest('.sg-piece');
    if (disabled || !piece || !event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    pickup();
    drag = { piece, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    try { piece.setPointerCapture(event.pointerId); } catch { /* Taps remain available. */ }
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
    hitSlot(event)?.classList.add('is-over');
  }, { signal: events.signal });
  board.addEventListener('pointerup', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const moved = drag.moved;
    const slot = moved ? hitSlot(event) : null;
    clearDrag();
    if (moved) { suppressClick = true; attempt(slot); }
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
      material = MATERIALS[Math.floor(random() * MATERIALS.length)];
      const angles = target.id === 'triangle' ? [90, 180] : target.id === 'square' ? [45, 90] : [0];
      rotation = angles[Math.floor(random() * angles.length)];
      board.className = 'shape-game';
      board.dataset.targetShape = target.id;
      board.dataset.material = material.id;
      board.innerHTML = `<div class="sg-house">${toyHouse()}<div class="sg-slots">${shuffled(SHAPES, random).map((shape) => `<button class="mini-option sg-slot" data-value="${shape.id}" data-drop-shape="${shape.id}" data-rotation="0" aria-label="جای ${shape.name}"><span class="animal-art sg-slot-art">${shapeSVG(shape, material, true)}</span><span class="sg-slot-label">${shape.name}</span></button>`).join('')}</div></div><span class="sg-match-arrow" aria-hidden="true"><svg viewBox="0 0 46 35" fill="none"><path d="M42 18H11m9-9-9 9 9 9" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 7"/></svg></span><div class="sg-piece-zone"><button class="sg-piece" data-shape="${target.id}" data-rotation="${rotation}" aria-label="قطعهٔ ${target.name}، بردار و در جای هم‌شکل بگذار" aria-pressed="false"><span class="sg-piece-art">${shapeSVG(target, material, false, rotation)}</span></button><span class="sg-piece-label">شکل من کجاست؟</span></div>`;
      setPrompt('شکل رو توی جای خودش بذار!');
      setDisabled(false);
    },
    setDisabled,
    retry() { clearDrag(); board.classList.remove('has-picked', 'hinting'); board.querySelector('.sg-piece')?.setAttribute('aria-pressed', 'false'); },
    hint() { pickup(); board.classList.add('hinting'); },
    destroy() { clearDrag(); events.abort(); board.remove(); },
  };
}
