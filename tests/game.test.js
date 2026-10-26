import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS, ROUND_COUNT, createRounds, checkAnswer } from '../src/game.js';

function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('every question has three distinct valid animals, includes its answer, and avoids ambiguous buzzing pairs', () => {
  const ids = new Set(ANIMALS.map(({ id }) => id));
  const seenTargets = new Set();
  const seenChoiceSets = new Set();
  for (let seed = 0; seed < 1000; seed++) {
    const rounds = createRounds(seeded(seed));
    assert.equal(rounds.length, ROUND_COUNT);
    assert.equal(new Set(rounds.map(({ target }) => target)).size, ROUND_COUNT);
    for (const { target, choices } of rounds) {
      assert.equal(choices.length, 3);
      assert.equal(new Set(choices).size, 3);
      assert.ok(choices.includes(target));
      assert.ok(choices.every((id) => ids.has(id)));
      assert.ok(!(choices.includes('bee') && choices.includes('fly')));
      seenTargets.add(target);
      seenChoiceSets.add([...choices].sort().join(','));
    }
  }
  assert.deepEqual(seenTargets, ids, 'Every animal should be reachable as an answer');
  assert.ok(seenChoiceSets.size > 100, 'Questions should draw from a varied pool, rather than one fixed trio');
});

test('the requested animals are present and each game can accept only its current answer', () => {
  const ids = new Set(ANIMALS.map(({ id }) => id));
  for (const id of ['cow', 'sheep', 'chick', 'crow', 'monkey', 'lion', 'fly', 'bee', 'rooster', 'hen', 'horse', 'donkey']) {
    assert.ok(ids.has(id), `Missing requested animal: ${id}`);
  }
  const rounds = createRounds(seeded(68));
  for (let index = 0; index < rounds.length; index++) {
    const { target, choices } = rounds[index];
    assert.equal(checkAnswer(rounds, index, target), true);
    assert.equal(checkAnswer(rounds, index, choices.find((id) => id !== target)), false);
  }
  assert.equal(checkAnswer(rounds, -1, rounds[0].target), false);
  assert.equal(checkAnswer(rounds, rounds.length, undefined), false);
  assert.notDeepEqual(createRounds(seeded(1)), createRounds(seeded(2)));
});
