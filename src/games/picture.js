import { pictureActor, pictureCue, pictureGarden } from './picture-art.js';
import './picture.css';

const ACTIONS = [
  { id: 'run', question: 'کی داره می‌دوه؟', label: 'در حال دویدن', answer: 'داره می‌دوه' },
  { id: 'eat', question: 'کی داره غذا می‌خوره؟', label: 'در حال غذا خوردن', answer: 'داره غذا می‌خوره' },
  { id: 'sleep', question: 'کی خوابیده؟', label: 'در حال خوابیدن', answer: 'خوابیده' },
  { id: 'water', question: 'کی داره به گل آب می‌ده؟', label: 'در حال آب دادن به گل', answer: 'داره به گل آب می‌ده' },
  { id: 'paint', question: 'کی داره نقاشی می‌کشه؟', label: 'در حال نقاشی کشیدن', answer: 'داره نقاشی می‌کشه' },
];
const CHARACTERS = [{ id: 'rabbit', name: 'خرگوش' }, { id: 'cat', name: 'گربه' }, { id: 'bear', name: 'خرس' }];
const byAction = (id) => ACTIONS.find((action) => action.id === id);

function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

/** Understand a spoken/pictured verb and find its actor in one shared scene. */
export function createPictureGame({ mount, submit, setPrompt, random = Math.random }) {
  let disabled = false;
  let plan = [];
  let target = ACTIONS[0];
  let actors = [];
  mount.innerHTML = '<div class="picture-game" data-target-action="run"></div>';
  const board = mount.querySelector('.picture-game');

  function startRound(index) {
    if (index === 0 || !plan.length) plan = shuffled(ACTIONS, random);
    target = plan[index % plan.length];
    const choices = shuffled([target, ...shuffled(ACTIONS.filter((action) => action.id !== target.id), random).slice(0, 2)], random);
    const friends = shuffled(CHARACTERS, random);
    actors = choices.map((action, position) => ({ action, character: friends[position] }));
    board.dataset.targetAction = target.id;
    board.classList.remove('is-hinting');
    board.innerHTML = `<div class="picture-question" aria-label="نشانهٔ تصویری پرسش؛ دوستِ در حال همین کار را پیدا کن">
      <span class="picture-search" aria-hidden="true"><svg viewBox="0 0 30 30" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="3"/><path d="m18 18 8 8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="m9 11 2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <div class="picture-cue" data-action="${target.id}" aria-label="${target.label}">${pictureCue(target.id)}</div>
      <span class="picture-question-mark" aria-hidden="true">؟</span>
    </div><div class="picture-scene" role="group" aria-label="دوستان در باغ؛ هر دوست مشغول کار متفاوتی است">
      ${pictureGarden}<div class="picture-actors">${actors.map(({ action, character }) => `<button class="picture-actor mini-option" data-picture-action="${action.id}" data-character="${character.id}" aria-label="${character.name} ${action.label}"><span class="animal-art picture-actor-art">${pictureActor(character.id, action.id)}</span><span class="picture-ground" aria-hidden="true"></span></button>`).join('')}</div>
    </div>`;
    setPrompt(target.question);
    setDisabled(disabled);
  }

  function click(event) {
    if (disabled) return;
    const actor = event.target.closest('[data-picture-action]');
    if (!actor || !board.contains(actor)) return;
    board.classList.remove('is-hinting');
    const action = byAction(actor.dataset.pictureAction);
    const character = CHARACTERS.find((friend) => friend.id === actor.dataset.character);
    const correct = action.id === target.id;
    submit(correct, actor, `آفرین! ${character.name} ${target.answer}!`);
  }

  function setDisabled(value) {
    disabled = Boolean(value);
    board.querySelectorAll('[data-picture-action]').forEach((button) => { button.disabled = disabled; });
  }

  function retry() {
    board.classList.remove('is-hinting');
    setPrompt(target.question);
  }

  function hint() {
    board.classList.remove('is-hinting');
    void board.offsetWidth;
    board.classList.add('is-hinting');
  }

  board.addEventListener('click', click);
  return {
    roundCount: 5, startRound, setDisabled, retry, hint,
    destroy() { board.removeEventListener('click', click); mount.replaceChildren(); },
  };
}
