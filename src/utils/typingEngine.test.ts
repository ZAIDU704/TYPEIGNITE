import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialStrictTypingState,
  processStrictCharacterKey,
  processStrictBackspace,
  calculateTypingStats,
} from './typingEngine';
import {
  PRACTICE_PASSAGES,
  SENTENCE_POOL,
  BEGINNER_SENTENCE_POOL,
  getSentenceAt,
  createFreshRaceSeed,
} from './sentences';
import {
  getAiBotTargetWpms,
  createInitialCarPhysics,
  launchCarsAtBaseSpeed,
  applyTypingToCarPhysics,
} from './carPhysics';

test('Strict Typing Tutor: BILAL AHMAD DAR exact prompt scenario', () => {
  const target = 'BILAL AHMAD DAR';
  let state = createInitialStrictTypingState(target);
  const nextSentenceFn = () => 'Next passage after completion.';

  // 1. Type "B" -> accepted
  state = processStrictCharacterKey(state, 'B', nextSentenceFn);
  assert.equal(state.lastEvent, 'accepted');
  assert.equal(state.userInput, 'B');
  assert.equal(state.userInput.length, 1); // Cursor at index 1 ("I")
  assert.equal(state.correctCharsTotal, 1);
  assert.equal(state.incorrectCharsTotal, 0);

  // 2. Type "I" -> accepted
  state = processStrictCharacterKey(state, 'I', nextSentenceFn);
  assert.equal(state.lastEvent, 'accepted');
  assert.equal(state.userInput, 'BI');
  assert.equal(state.userInput.length, 2); // Cursor at index 2 ("L")
  assert.equal(state.correctCharsTotal, 2);
  assert.equal(state.incorrectCharsTotal, 0);

  // 3. Type "L" -> accepted
  state = processStrictCharacterKey(state, 'L', nextSentenceFn);
  assert.equal(state.lastEvent, 'accepted');
  assert.equal(state.userInput, 'BIL');
  assert.equal(state.userInput.length, 3); // Cursor at index 3 ("A")
  assert.equal(state.correctCharsTotal, 3);
  assert.equal(state.incorrectCharsTotal, 0);

  // 4. Type "X" instead of expected "A" -> rejected completely
  const statsBeforeError = calculateTypingStats(
    state.correctCharsTotal,
    state.incorrectCharsTotal,
    state.totalKeystrokes,
    state.backspacesTotal,
    state.completedSentences,
    state.completedWords,
    10
  );

  state = processStrictCharacterKey(state, 'X', nextSentenceFn);
  assert.equal(state.lastEvent, 'rejected');
  assert.equal(state.lastRejectedChar, 'X');
  assert.equal(state.userInput, 'BIL'); // "X" never appears in accepted text
  assert.ok(!state.userInput.includes('X'));
  assert.equal(state.userInput.length, 3); // Cursor stays at index 3 ("A")
  assert.equal(state.correctCharsTotal, 3); // Correct chars unchanged
  assert.equal(state.incorrectCharsTotal, 1); // Errors incremented
  assert.equal(state.speedBoostChars, 0);
  assert.equal(state.progressDeltaChars, 0);

  const statsAfterError = calculateTypingStats(
    state.correctCharsTotal,
    state.incorrectCharsTotal,
    state.totalKeystrokes,
    state.backspacesTotal,
    state.completedSentences,
    state.completedWords,
    10
  );
  // Error must NEVER increase WPM
  assert.ok(statsAfterError.netWpm <= statsBeforeError.netWpm);
  assert.equal(statsAfterError.incorrectChars, 1);

  // 5. Type "A" -> accepted, cursor moves forward to index 4 ("L")
  state = processStrictCharacterKey(state, 'A', nextSentenceFn);
  assert.equal(state.lastEvent, 'accepted');
  assert.equal(state.userInput, 'BILA');
  assert.equal(state.userInput.length, 4);
  assert.equal(state.correctCharsTotal, 4);
  assert.equal(state.incorrectCharsTotal, 1);
});

test('Strict Typing Tutor: Case sensitivity, spaces, and punctuation', () => {
  const target = 'Hello, World! 100% Ready?';
  let state = createInitialStrictTypingState(target);
  const nextSentenceFn = () => 'Second sentence.';

  // Lowercase 'h' when 'H' is expected -> rejected
  state = processStrictCharacterKey(state, 'h', nextSentenceFn);
  assert.equal(state.lastEvent, 'rejected');
  assert.equal(state.userInput, '');
  assert.equal(state.incorrectCharsTotal, 1);

  // Correct 'H', 'e', 'l', 'l', 'o'
  for (const ch of 'Hello') {
    state = processStrictCharacterKey(state, ch, nextSentenceFn);
    assert.equal(state.lastEvent, 'accepted');
  }
  assert.equal(state.userInput, 'Hello');

  // Expecting comma ',' -> typing space ' ' is rejected
  state = processStrictCharacterKey(state, ' ', nextSentenceFn);
  assert.equal(state.lastEvent, 'rejected');
  assert.equal(state.userInput, 'Hello');
  assert.equal(state.incorrectCharsTotal, 2);

  // Type ',' then ' '
  state = processStrictCharacterKey(state, ',', nextSentenceFn);
  assert.equal(state.lastEvent, 'accepted');
  state = processStrictCharacterKey(state, ' ', nextSentenceFn);
  assert.equal(state.lastEvent, 'accepted');
  assert.equal(state.userInput, 'Hello, ');
});

test('Strict Typing Tutor: Backspace undoes accepted characters and recalculates progress', () => {
  const target = 'Speed Rush';
  let state = createInitialStrictTypingState(target);
  const nextSentenceFn = () => 'Next.';

  for (const ch of 'Spe') {
    state = processStrictCharacterKey(state, ch, nextSentenceFn);
  }
  assert.equal(state.userInput, 'Spe');
  assert.equal(state.correctCharsTotal, 3);

  // Press Backspace -> removes 'e', recalculates correctCharsTotal to 2
  state = processStrictBackspace(state);
  assert.equal(state.lastEvent, 'backspace');
  assert.equal(state.userInput, 'Sp');
  assert.equal(state.correctCharsTotal, 2);
  assert.equal(state.backspacesTotal, 1);
  assert.equal(state.progressDeltaChars, -1);

  // Retype 'e' -> accepted, restores correctCharsTotal to 3, but speedBoostChars is 0 (anti-farming)
  state = processStrictCharacterKey(state, 'e', nextSentenceFn);
  assert.equal(state.lastEvent, 'accepted');
  assert.equal(state.userInput, 'Spe');
  assert.equal(state.correctCharsTotal, 3);
  assert.equal(state.speedBoostChars, 0);

  // Type next new frontier character 'e' (index 4) -> speedBoostChars is 1
  state = processStrictCharacterKey(state, 'e', nextSentenceFn);
  assert.equal(state.lastEvent, 'accepted');
  assert.equal(state.userInput, 'Spee');
  assert.equal(state.correctCharsTotal, 4);
  assert.equal(state.speedBoostChars, 1);
});

test('Strict Typing Tutor: Completing a full sentence loads the next passage cleanly', () => {
  const first = 'Go fast.';
  const second = 'Stay sharp!';
  let state = createInitialStrictTypingState(first);

  for (let i = 0; i < first.length; i++) {
    state = processStrictCharacterKey(state, first[i], () => second);
  }

  assert.equal(state.lastEvent, 'sentence_completed');
  assert.equal(state.currentSentence, second);
  assert.equal(state.sentenceIndex, 1);
  assert.equal(state.userInput, '');
  assert.equal(state.completedSentences, 1);
  assert.equal(state.completedWords, 2);
  assert.equal(state.completedSentencesChars, first.length);
  assert.equal(state.correctCharsTotal, first.length);
});

test('Practice Passages: Rich 8-category pool and non-repeating shuffled sequence', () => {
  assert.ok(SENTENCE_POOL.length >= 80, 'Pool should contain at least 80 passages');

  const categories = new Set(PRACTICE_PASSAGES.map((p) => p.category));
  assert.equal(categories.size, 8, 'All 8 required topic categories must be present');

  // Verify no duplicates within a full cycle for a given seed
  const seed = createFreshRaceSeed();
  const seenInCycle = new Set<string>();
  for (let i = 0; i < SENTENCE_POOL.length; i++) {
    const passage = getSentenceAt(i, seed);
    assert.ok(passage.length >= 40, 'Passage should be meaningful and natural');
    seenInCycle.add(passage);
  }
  assert.equal(
    seenInCycle.size,
    SENTENCE_POOL.length,
    'Every passage in a cycle must be unique without repeats'
  );
});

test('Beginner Mode: Short, simple sentences and custom Target WPM scaling while preserving Rookie/Pro/Master', () => {
  assert.ok(BEGINNER_SENTENCE_POOL.length >= 25, 'Beginner pool should have at least 25 simple sentences');

  const seed = 12345;
  const seenBeginner = new Set<string>();
  for (let i = 0; i < BEGINNER_SENTENCE_POOL.length; i++) {
    const s = getSentenceAt(i, seed, 'beginner');
    assert.ok(BEGINNER_SENTENCE_POOL.includes(s), 'Must come from beginner sentence pool');
    assert.ok(s.length >= 25 && s.length <= 65, 'Beginner sentences must be short and simple');
    seenBeginner.add(s);
  }
  assert.equal(seenBeginner.size, BEGINNER_SENTENCE_POOL.length, 'No repeats within a beginner cycle');

  // Verify Rookie, Pro, Master still use standard SENTENCE_POOL
  for (const diff of ['rookie', 'pro', 'master'] as const) {
    const s = getSentenceAt(0, seed, diff);
    assert.ok(SENTENCE_POOL.includes(s), `${diff} must use standard SENTENCE_POOL`);
  }

  // Verify AI bot speeds scale with custom beginnerTargetWpm and remain unchanged for Rookie, Pro, Master
  const wpmsAt20 = getAiBotTargetWpms('beginner', 20);
  const wpmsAt35 = getAiBotTargetWpms('beginner', 35);
  assert.ok(wpmsAt20[0] <= 20 && wpmsAt20[0] >= 15);
  assert.ok(wpmsAt35[0] > wpmsAt20[0], 'Higher custom target WPM increases beginner AI pace');

  assert.deepEqual(getAiBotTargetWpms('rookie'), [38, 35, 31]);
  assert.deepEqual(getAiBotTargetWpms('pro'), [66, 59, 52]);
  assert.deepEqual(getAiBotTargetWpms('master'), [92, 88, 83]);
});

test('Car Physics Integration: Incorrect keys never boost speed or distance; Backspace trims progress', () => {
  const [car0] = launchCarsAtBaseSpeed([createInitialCarPhysics('self', 0, true, true, 65)]);
  const afterCorrect = applyTypingToCarPhysics(car0, 1, 0);
  assert.ok(afterCorrect.targetSpeed > car0.targetSpeed, 'Correct char increases target speed');

  const afterError = applyTypingToCarPhysics(afterCorrect, 0, 1);
  assert.ok(
    afterError.targetSpeed <= afterCorrect.targetSpeed,
    'Incorrect char must never increase target speed'
  );
  assert.equal(afterError.distance, afterCorrect.distance, 'Incorrect char must not add distance');
});
