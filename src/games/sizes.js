import { asset } from '../assets.js';
import './count-sizes.css';

const friends = [
  { id: 'cow', name: 'گاو' }, { id: 'sheep', name: 'گوسفند' },
  { id: 'lion', name: 'شیر' }, { id: 'cat', name: 'گربه' },
  { id: 'dog', name: 'سگ' }, { id: 'duck', name: 'اردک' }, { id: 'frog', name: 'قورباغه' },
];

function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createSizesGame({ mount, submit, setPrompt, random = Math.random }) {
  let disabled = false;
  let target = 'large';
  let plan = [];
  let previousFriend = '';
  let friend = friends[0];
  mount.innerHTML = '<div class="sizes-game" data-target-size="large"></div>';
  const board = mount.querySelector('.sizes-game');
  const sizeWord = (size) => size === 'large' ? 'بزرگ' : 'کوچولو';

  function option(size) {
    return `<button class="sizes-choice mini-option" data-size="${size}" aria-label="${friend.name} ${sizeWord(size)}"><span class="sizes-choice-frame"><span class="animal-art sizes-choice-art"><span class="animal-halo"></span><img src="${asset(`/art/${friend.id}.svg`)}" alt="" draggable="false" /></span></span><span class="sizes-choice-label">${sizeWord(size)}</span></button>`;
  }

  function startRound(index) {
    if (index === 0 || !plan.length) plan = shuffled(['large', 'small', 'large', 'small', random() < 0.5 ? 'large' : 'small'], random);
    target = plan[index % plan.length];
    const candidates = friends.filter((item) => item.id !== previousFriend);
    friend = candidates[Math.floor(random() * candidates.length)];
    previousFriend = friend.id;
    const choices = shuffled(['large', 'small'], random);
    board.dataset.targetSize = target;
    board.dataset.friend = friend.id;
    board.classList.remove('is-hinting');
    board.innerHTML = `${option(choices[0])}<div class="sizes-goal" aria-label="${friend.name} ${sizeWord(target)} را پیدا کن"><span class="sizes-goal-caption">این اندازه رو پیدا کن</span><div class="sizes-reference-pair" aria-hidden="true">${['large', 'small'].map((size) => `<div class="sizes-reference ${size === target ? 'is-requested' : ''}" data-reference-size="${size}"><span class="sizes-reference-frame"><img src="${asset(`/art/${friend.id}.svg`)}" alt="" draggable="false" /></span><span class="sizes-reference-dot">${size === target ? '★' : '·'}</span></div>`).join('')}</div><span class="sizes-requested-label">${sizeWord(target)}</span></div>${option(choices[1])}`;
    setDisabled(disabled);
    setPrompt(`${friend.name} ${sizeWord(target)} رو پیدا کن!`);
  }

  function onClick(event) {
    if (disabled) return;
    const choice = event.target.closest('[data-size]');
    if (!choice || !board.contains(choice)) return;
    board.classList.remove('is-hinting');
    const correct = choice.dataset.size === target;
    submit(correct, choice, `آفرین! ${friend.name} ${sizeWord(target)} رو پیدا کردی!`);
  }

  function setDisabled(value) {
    disabled = value;
    board.querySelectorAll('[data-size]').forEach((button) => { button.disabled = value; });
  }

  function retry() {
    board.classList.remove('is-hinting');
    setPrompt(`${friend.name} ${sizeWord(target)} رو پیدا کن!`);
  }

  function hint() {
    board.classList.remove('is-hinting');
    void board.offsetWidth;
    board.classList.add('is-hinting');
  }

  board.addEventListener('click', onClick);
  return { roundCount: 5, startRound, setDisabled, retry, hint, destroy() { board.removeEventListener('click', onClick); mount.replaceChildren(); } };
}
