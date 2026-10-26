export const ANIMALS = [
  { id: 'cow', name: 'گاو', color: '#efd7b1' },
  { id: 'sheep', name: 'گوسفند', color: '#e8dbf5' },
  { id: 'chick', name: 'جوجه', color: '#f9df88' },
  { id: 'crow', name: 'کلاغ', color: '#d4d9e6' },
  { id: 'monkey', name: 'میمون', color: '#e9caa6' },
  { id: 'lion', name: 'شیر', color: '#efc773' },
  { id: 'fly', name: 'مگس', color: '#d8e4e8', soundFamily: 'buzz' },
  { id: 'bee', name: 'زنبور', color: '#f9df88', soundFamily: 'buzz' },
  { id: 'rooster', name: 'خروس', color: '#e6b591' },
  { id: 'hen', name: 'مرغ', color: '#edc3a2' },
  { id: 'horse', name: 'اسب', color: '#dcb38c' },
  { id: 'donkey', name: 'الاغ', color: '#d3d9df' },
  { id: 'dog', name: 'سگ', color: '#efd1a5' },
  { id: 'cat', name: 'گربه', color: '#eac49c' },
  { id: 'duck', name: 'اردک', color: '#e0e8c4' },
  { id: 'pig', name: 'خوک', color: '#f1c7cc' },
  { id: 'frog', name: 'قورباغه', color: '#d0e0ad' },
];

export const ROUND_COUNT = 5;
export const animalById = (id) => ANIMALS.find((animal) => animal.id === id);

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Three distinct animals per question; the answer changes between questions.
// Avoid a bee/fly discrimination task: both have similar buzzing calls.
export function createRounds(random = Math.random) {
  const targets = shuffle(ANIMALS, random).slice(0, ROUND_COUNT);
  return targets.map((target) => {
    const choices = [target];
    const candidates = shuffle(ANIMALS.filter((animal) => animal.id !== target.id), random);
    for (const candidate of candidates) {
      if (candidate.soundFamily && choices.some((animal) => animal.soundFamily === candidate.soundFamily)) continue;
      choices.push(candidate);
      if (choices.length === 3) break;
    }
    return { target: target.id, choices: shuffle(choices.map((animal) => animal.id), random) };
  });
}

export function checkAnswer(rounds, round, animalId) {
  return round >= 0 && round < rounds.length && rounds[round].target === animalId;
}
