import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ANIMALS, AUDIO_REVIEW, PLAYABLE_ANIMALS, ROUND_COUNT, createRounds, checkAnswer } from '../src/game.js';

function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('every question has three distinct valid animals, includes its answer, and avoids ambiguous buzzing pairs', () => {
  const ids = new Set(PLAYABLE_ANIMALS.map(({ id }) => id));
  const heldOut = new Set(ANIMALS.filter(({ id }) => !ids.has(id)).map(({ id }) => id));
  assert.ok(ids.size >= ROUND_COUNT);
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
      assert.ok(choices.every((id) => ids.has(id)), 'Only enabled recordings may appear in a question');
      assert.ok(choices.every((id) => !heldOut.has(id)), 'Held-out recordings must not appear as distractors or answers');
      assert.ok(!(choices.includes('bee') && choices.includes('fly')));
      seenTargets.add(target);
      seenChoiceSets.add([...choices].sort().join(','));
    }
  }
  assert.deepEqual(seenTargets, ids, 'Every enabled animal should be reachable as an answer');
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

test('recording metadata matches the shipped files and reported incorrect samples are replaced', () => {
  const recordings = JSON.parse(readFileSync(new URL('../src/recordings.json', import.meta.url), 'utf8'));
  const byId = new Map(recordings.map((recording) => [recording.id, recording]));
  const knownIncorrect = {
    lion: '77ca2d8535b76405d2e5b006576cca8f89d59f1e281d0577c5499ab2b9c35b5b',
    crow: '3fa8af5037f8892197f2d408c1145b187d0a70ddca890c2d91fe8839b7784eae',
  };
  for (const { id } of ANIMALS) {
    const recording = byId.get(id);
    assert.ok(recording, `Missing provenance for ${id}`);
    const hash = createHash('sha256').update(readFileSync(new URL(`../public/audio/${id}.mp3`, import.meta.url))).digest('hex');
    assert.equal(hash, recording.sha256, `Provenance must refer to the exact shipped ${id} recording`);
    assert.equal(hash, AUDIO_REVIEW.animals[id]?.sha256, `Screening evidence must refer to the exact shipped ${id} recording`);
    if (knownIncorrect[id]) assert.notEqual(hash, knownIncorrect[id], `The reported incorrect ${id} sample must not return`);
  }
});

test('uncertain recordings stay out of the quiz and corrected lion/crow retain event-screening evidence', () => {
  const playableIds = new Set(PLAYABLE_ANIMALS.map(({ id }) => id));
  for (const id of ['chick', 'monkey', 'donkey']) {
    assert.equal(AUDIO_REVIEW.animals[id].enabled, false);
    assert.equal(AUDIO_REVIEW.animals[id].status, 'withheld');
    assert.ok(!playableIds.has(id), `${id} needs a clearer sample before returning to the quiz`);
  }
  assert.match(AUDIO_REVIEW.model.sha256, /^[a-f0-9]{64}$/);
  assert.equal(typeof AUDIO_REVIEW.humanListeningPerformed, 'boolean');
  for (const [id, expectedEvent] of [['lion', 'Roar'], ['crow', 'Caw']]) {
    const review = AUDIO_REVIEW.animals[id];
    assert.equal(review.enabled, true);
    assert.equal(review.expected_event, expectedEvent);
    assert.ok(review.event_score_mean >= 0.5, `${id} should retain strong stored evidence for ${expectedEvent}`);
    assert.ok(review.top_events.some(([label, score]) => label === expectedEvent && score >= 0.5));
  }
});
