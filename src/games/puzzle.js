import { asset } from '../assets.js';
import './puzzle.css';

// The three paths tile the same 420×420 image. The two asymmetric tabs make
// matching possible from the piece outline as well as the pictured animal.
const REGIONS = [
  'M0 0H140V125C150 125 152 115 165 115C185 115 185 155 165 155C152 155 150 145 140 145V420H0Z',
  'M140 0H280V245C270 245 268 235 255 235C235 235 235 275 255 275C268 275 270 265 280 265V420H140V145C150 145 152 155 165 155C185 155 185 115 165 115C152 115 150 125 140 125V0Z',
  'M280 0H420V420H280V265C270 265 268 275 255 275C235 275 235 235 255 235C268 235 270 245 280 245V0Z',
];
const ANIMAL_IDS = ['duck', 'cat', 'cow', 'lion', 'dog'];
const FA_DIGITS = ['۱', '۲', '۳'];
let instance = 0;

function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

export function createPuzzleGame({ mount, submit, setPrompt, random = Math.random }) {
  const prefix = `little-puzzle-${++instance}`;
  let animalId = '';
  let selected = null;
  let placed = new Set();
  let disabled = false;
  let destroyed = false;
  let dragging = null;
  let ghost = null;

  function pieceSvg(index, purpose = 'piece') {
    const clipId = `${prefix}-${purpose}-${index}`;
    const viewBox = purpose === 'slot' ? `${index * 140} 0 140 420` : `${[-2, 115, 232][index]} -5 190 430`;
    return `<svg class="puzzle-piece-svg" viewBox="${viewBox}" fill="none" aria-hidden="true">
      <defs><clipPath id="${clipId}"><path d="${REGIONS[index]}" /></clipPath></defs>
      <path class="puzzle-piece-material" d="${REGIONS[index]}" fill="#fff9e8" />
      <image class="puzzle-fragment-image" href="${asset(`/art/${animalId}.svg`)}" width="420" height="420" clip-path="url(#${clipId})" />
      <path class="puzzle-piece-edge" d="${REGIONS[index]}" stroke="#d6c6a5" stroke-width="5" stroke-linejoin="round" />
    </svg>`;
  }

  function removeGhost() {
    ghost?.remove();
    ghost = null;
  }

  function cancelDrag() {
    if (dragging) {
      try { dragging.button.releasePointerCapture(dragging.pointerId); } catch { /* Already released. */ }
    }
    dragging = null;
    removeGhost();
  }

  function refresh() {
    if (destroyed) return;
    for (const piece of mount.querySelectorAll('[data-piece]')) {
      const index = Number(piece.dataset.piece);
      const complete = placed.has(index);
      piece.disabled = disabled || complete;
      piece.dataset.placed = String(complete);
      piece.setAttribute('aria-pressed', String(selected === index && !complete));
      piece.classList.toggle('is-selected', selected === index && !complete);
    }
    for (const slot of mount.querySelectorAll('[data-slot]')) {
      const index = Number(slot.dataset.slot);
      const complete = placed.has(index);
      slot.disabled = disabled || complete;
      slot.dataset.placed = String(complete);
      slot.classList.toggle('is-placed', complete);
      slot.classList.toggle('can-place', selected !== null && !complete);
      slot.setAttribute('aria-label', complete ? `قطعهٔ ${FA_DIGITS[index]} کامل شده` : `جای قطعهٔ ${FA_DIGITS[index]}`);
    }
    mount.querySelector('.puzzle-game')?.classList.toggle('has-selection', selected !== null);
    const status = mount.querySelector('.puzzle-progress-label');
    if (status) status.textContent = `${placed.size.toLocaleString('fa-IR')} از ۳ قطعه`;
  }

  function draw() {
    const order = shuffled([0, 1, 2], random);
    mount.innerHTML = `<div class="puzzle-game">
      <div class="puzzle-board-area">
        <div class="puzzle-board" role="group" aria-label="تصویر پازل و جای قطعه‌ها">
          <img class="puzzle-guide" src="${asset(`/art/${animalId}.svg`)}" alt="" draggable="false" />
          <div class="puzzle-slots">${[0, 1, 2].map((index) => `<button class="puzzle-slot mini-option" data-slot="${index}" data-placed="false" aria-label="جای قطعهٔ ${FA_DIGITS[index]}">${pieceSvg(index, 'slot')}</button>`).join('')}</div>
          <span class="puzzle-board-star" aria-hidden="true">✧</span>
        </div>
        <span class="puzzle-progress-label" aria-live="polite">۰ از ۳ قطعه</span>
      </div>
      <span class="puzzle-direction" aria-hidden="true">‹</span>
      <div class="puzzle-tray" role="group" aria-label="قطعه‌های پازل؛ یک قطعه و سپس جای خالی را لمس کنید">
        ${order.map((index) => `<button class="puzzle-piece mini-option" data-piece="${index}" data-placed="false" aria-pressed="false" aria-label="قطعهٔ ${FA_DIGITS[index]}">${pieceSvg(index)}<span class="puzzle-piece-check" aria-hidden="true">✓</span></button>`).join('')}
      </div>
    </div>`;
    refresh();
  }

  function selectPiece(index) {
    if (destroyed || disabled || placed.has(index)) return;
    selected = index;
    refresh();
    setPrompt('حالا جای خالیِ همین قطعه رو پیدا کن!');
  }

  function placePiece(index) {
    if (destroyed || disabled || placed.has(index)) return;
    if (selected === null) {
      setPrompt('اول یک قطعه رو بردار، بعد جای خودش بذار!');
      hint();
      return;
    }
    const correct = selected === index;
    const slot = mount.querySelector(`[data-slot="${index}"]`);
    const accepted = submit(correct, slot, correct ? 'آفرین! این قطعه جاش درست بود!' : 'این جا نبود؛ دوباره امتحان کن!');
    if (!accepted) return;
    if (correct) {
      placed.add(index);
      selected = null;
      refresh();
    }
  }

  function click(event) {
    const piece = event.target.closest('[data-piece]');
    if (piece && mount.contains(piece)) { selectPiece(Number(piece.dataset.piece)); return; }
    const slot = event.target.closest('[data-slot]');
    if (slot && mount.contains(slot)) placePiece(Number(slot.dataset.slot));
  }

  function pointerDown(event) {
    const button = event.target.closest('[data-piece]');
    if (!button || !mount.contains(button) || disabled || destroyed || placed.has(Number(button.dataset.piece)) || event.button !== 0) return;
    selectPiece(Number(button.dataset.piece));
    dragging = { button, index: Number(button.dataset.piece), pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    try { button.setPointerCapture(event.pointerId); } catch { /* Tap-to-place still works. */ }
  }

  function pointerMove(event) {
    if (!dragging || dragging.pointerId !== event.pointerId || disabled) return;
    if (!dragging.moved && Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) < 8) return;
    dragging.moved = true;
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.className = 'puzzle-drag-preview';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.innerHTML = pieceSvg(dragging.index, 'drag');
      mount.append(ghost);
    }
    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;
  }

  function pointerUp(event) {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    const moved = dragging.moved;
    const slot = moved ? document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot]') : null;
    cancelDrag();
    if (slot && mount.contains(slot)) placePiece(Number(slot.dataset.slot));
  }

  function hint() {
    const game = mount.querySelector('.puzzle-game');
    if (!game) return;
    game.classList.remove('is-hinting');
    void game.offsetWidth;
    game.classList.add('is-hinting');
  }

  mount.addEventListener('click', click);
  mount.addEventListener('pointerdown', pointerDown);
  mount.addEventListener('pointermove', pointerMove);
  mount.addEventListener('pointerup', pointerUp);
  mount.addEventListener('pointercancel', cancelDrag);

  return {
    roundCount: 3,
    startRound(index) {
      if (destroyed) return;
      cancelDrag();
      selected = null;
      if (index === 0 || !animalId) {
        const candidates = ANIMAL_IDS.filter((id) => id !== animalId);
        animalId = candidates[Math.floor(random() * candidates.length)];
        placed = new Set();
        draw();
      } else refresh();
      setPrompt('یک قطعه رو بردار، جای خودش بذار!');
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
      refresh();
      setPrompt('دوباره نگاه کن؛ هر قطعه یک جای مخصوص داره!');
    },
    hint,
    destroy() {
      destroyed = true;
      cancelDrag();
      mount.removeEventListener('click', click);
      mount.removeEventListener('pointerdown', pointerDown);
      mount.removeEventListener('pointermove', pointerMove);
      mount.removeEventListener('pointerup', pointerUp);
      mount.removeEventListener('pointercancel', cancelDrag);
      mount.replaceChildren();
    },
  };
}
