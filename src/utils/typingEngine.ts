import { TypingStats } from '../types/game';

export const RACE_DURATION_SECONDS = 120;
export const TARGET_CHARACTERS_FOR_FINISH = 600; // ~60 WPM for 2 minutes finishes 100% of track

export interface StrictTypingState {
  currentSentence: string;
  sentenceIndex: number;
  userInput: string;
  maxIndexReachedInSentence: number;
  completedSentencesChars: number;
  correctCharsTotal: number;
  incorrectCharsTotal: number;
  totalKeystrokes: number;
  backspacesTotal: number;
  completedSentences: number;
  completedWords: number;
  lastEvent: 'none' | 'accepted' | 'rejected' | 'backspace' | 'sentence_completed';
  lastRejectedChar: string | null;
  speedBoostChars: number;
  progressDeltaChars: number;
}

export function createInitialStrictTypingState(firstSentence: string): StrictTypingState {
  return {
    currentSentence: firstSentence,
    sentenceIndex: 0,
    userInput: '',
    maxIndexReachedInSentence: 0,
    completedSentencesChars: 0,
    correctCharsTotal: 0,
    incorrectCharsTotal: 0,
    totalKeystrokes: 0,
    backspacesTotal: 0,
    completedSentences: 0,
    completedWords: 0,
    lastEvent: 'none',
    lastRejectedChar: null,
    speedBoostChars: 0,
    progressDeltaChars: 0,
  };
}

/**
 * Strict character-by-character typing tutor validation:
 * - Accepts ONLY the exact next expected character (`currentSentence[userInput.length]`).
 * - Advances cursor by 1 when correct; completes sentence when final character is typed.
 * - Rejects any incorrect character completely: never appends to `userInput`, never moves cursor,
 *   increments `incorrectCharsTotal` and `totalKeystrokes`, and grants 0 speed/progress/WPM.
 */
export function processStrictCharacterKey(
  state: StrictTypingState,
  key: string,
  getNextSentence: (nextIndex: number) => string
): StrictTypingState {
  // Ignore non-printable or multi-character control keys (e.g., Shift, Control, Meta, Enter, Tab)
  if (!key || key.length !== 1) {
    return {
      ...state,
      lastEvent: 'none',
      lastRejectedChar: null,
      speedBoostChars: 0,
      progressDeltaChars: 0,
    };
  }

  const cursorIndex = state.userInput.length;
  const expectedChar = state.currentSentence[cursorIndex];

  if (expectedChar === undefined) {
    return {
      ...state,
      lastEvent: 'none',
      lastRejectedChar: null,
      speedBoostChars: 0,
      progressDeltaChars: 0,
    };
  }

  // Exact character match (case-sensitive, spaces, punctuation, symbols)
  if (key === expectedChar) {
    const nextUserInput = state.userInput + key;
    const nextLength = nextUserInput.length;
    const isNewFrontier = nextLength > state.maxIndexReachedInSentence;
    const nextMaxIndex = Math.max(state.maxIndexReachedInSentence, nextLength);
    const nextTotalKeystrokes = state.totalKeystrokes + 1;

    // Check if the entire sentence has now been accurately typed
    if (nextLength >= state.currentSentence.length) {
      const wordsInSentence = state.currentSentence.trim().split(/\s+/).filter(Boolean).length;
      const nextSentenceIndex = state.sentenceIndex + 1;
      const nextCompletedSentencesChars =
        state.completedSentencesChars + state.currentSentence.length;
      const nextSentenceText = getNextSentence(nextSentenceIndex);

      return {
        ...state,
        currentSentence: nextSentenceText,
        sentenceIndex: nextSentenceIndex,
        userInput: '',
        maxIndexReachedInSentence: 0,
        completedSentencesChars: nextCompletedSentencesChars,
        correctCharsTotal: nextCompletedSentencesChars,
        totalKeystrokes: nextTotalKeystrokes,
        completedSentences: state.completedSentences + 1,
        completedWords: state.completedWords + wordsInSentence,
        lastEvent: 'sentence_completed',
        lastRejectedChar: null,
        speedBoostChars: isNewFrontier ? 1 : 0,
        progressDeltaChars: 1,
      };
    }

    return {
      ...state,
      userInput: nextUserInput,
      maxIndexReachedInSentence: nextMaxIndex,
      correctCharsTotal: state.completedSentencesChars + nextLength,
      totalKeystrokes: nextTotalKeystrokes,
      lastEvent: 'accepted',
      lastRejectedChar: null,
      speedBoostChars: isNewFrontier ? 1 : 0,
      progressDeltaChars: 1,
    };
  }

  // Incorrect character: reject completely! Cursor and userInput do NOT change.
  return {
    ...state,
    incorrectCharsTotal: state.incorrectCharsTotal + 1,
    totalKeystrokes: state.totalKeystrokes + 1,
    lastEvent: 'rejected',
    lastRejectedChar: key,
    speedBoostChars: 0,
    progressDeltaChars: 0,
  };
}

/**
 * Handles Backspace in strict typing mode:
 * - Allows undoing previously accepted characters in the current sentence.
 * - Recalculates `correctCharsTotal` and emits `-1` progress delta so progress reflects the undo.
 */
export function processStrictBackspace(state: StrictTypingState): StrictTypingState {
  if (state.userInput.length === 0) {
    return {
      ...state,
      lastEvent: 'none',
      lastRejectedChar: null,
      speedBoostChars: 0,
      progressDeltaChars: 0,
    };
  }

  const nextUserInput = state.userInput.slice(0, -1);
  const nextCorrectCharsTotal = state.completedSentencesChars + nextUserInput.length;

  return {
    ...state,
    userInput: nextUserInput,
    correctCharsTotal: nextCorrectCharsTotal,
    backspacesTotal: state.backspacesTotal + 1,
    lastEvent: 'backspace',
    lastRejectedChar: null,
    speedBoostChars: 0,
    progressDeltaChars: -1,
  };
}

export function calculateTypingStats(
  correctChars: number,
  incorrectChars: number,
  totalKeystrokes: number,
  backspaces: number,
  completedSentences: number,
  completedWords: number,
  elapsedSeconds: number
): TypingStats {
  const safeAcceptedChars = Math.max(0, correctChars);
  const safeIncorrectChars = Math.max(0, incorrectChars);
  const safeMinutes = Math.max(elapsedSeconds / 60, 1 / 60); // Avoid extreme spikes in the first second

  // WPM is strictly computed from accepted (correct) characters so incorrect keypresses
  // NEVER increase grossWpm or netWpm.
  const grossWpm = safeAcceptedChars > 0 ? Math.round(safeAcceptedChars / 5 / safeMinutes) : 0;
  const netWpm = grossWpm;

  const totalAttempted = safeAcceptedChars + safeIncorrectChars;
  const accuracy =
    totalAttempted > 0
      ? Math.max(0, Math.min(100, Math.round((safeAcceptedChars / totalAttempted) * 100)))
      : 100;

  return {
    grossWpm,
    netWpm,
    accuracy,
    correctChars: safeAcceptedChars,
    incorrectChars: safeIncorrectChars,
    totalKeystrokes,
    backspaces,
    completedSentences,
    completedWords,
    elapsedSeconds,
  };
}

/**
 * Calculates current car speed and race progress percentage
 * based on accurate typing velocity and accuracy multiplier.
 */
export function calculateCarSpeed(
  netWpm: number,
  accuracy: number,
  recentKeystrokeDeltaMs: number
): number {
  if (netWpm <= 0) return 0;

  // Accuracy bonus/penalty factor (0.5 to 1.15)
  const accuracyFactor = Math.max(0.5, Math.min(1.15, accuracy / 92));

  // Decay speed smoothly if player pauses typing for > 1.5 seconds
  const activityDecay =
    recentKeystrokeDeltaMs > 2500
      ? 0.25
      : recentKeystrokeDeltaMs > 1200
      ? 0.65
      : 1.0;

  return Math.round(netWpm * accuracyFactor * activityDecay);
}

/**
 * Converts cumulative accurate characters into 0..100 track progress.
 */
export function calculateRaceProgress(correctChars: number): number {
  const raw = (Math.max(0, correctChars) / TARGET_CHARACTERS_FOR_FINISH) * 100;
  return Math.min(100, Math.round(raw * 10) / 10);
}

/**
 * Formats relative lead/gap text for the HUD.
 */
export function formatRelativeGap(
  playerProgress: number,
  racers: { id: string; name: string; progress: number; isSelf: boolean }[]
): string {
  const sorted = [...racers].sort((a, b) => b.progress - a.progress);
  const myIndex = sorted.findIndex((r) => r.isSelf);

  if (myIndex === 0) {
    const second = sorted[1];
    if (!second) return 'Leading the race!';
    const diffMeters = Math.max(0, Math.round((playerProgress - second.progress) * 5));
    return `1st Place — Ahead of ${second.name} by ${diffMeters}m`;
  } else {
    const leader = sorted[0];
    const diffMeters = Math.max(1, Math.round((leader.progress - playerProgress) * 5));
    const rankStr = myIndex === 1 ? '2nd' : myIndex === 2 ? '3rd' : '4th';
    return `${rankStr} Place — ${diffMeters}m behind ${leader.name}`;
  }
}

/**
 * Updates the `rank` (1..4) of each racer based on descending race progress
 * while preserving the original lane order of the array.
 */
export function updateRacerRanks<T extends { id: string; progress: number; wpm?: number; rank: number }>(
  racers: T[]
): T[] {
  const sortedIds = [...racers]
    .sort((a, b) => {
      if (Math.abs(b.progress - a.progress) > 0.001) {
        return b.progress - a.progress;
      }
      return (b.wpm || 0) - (a.wpm || 0);
    })
    .map((r) => r.id);

  return racers.map((r) => ({
    ...r,
    rank: sortedIds.indexOf(r.id) + 1,
  }));
}

/**
 * Formats relative lead/gap text for a player racer against all racers.
 */
export function getLeaderGapText(
  playerRacer: { id: string; name: string; progress: number; isSelf: boolean },
  racers: { id: string; name: string; progress: number; isSelf: boolean }[]
): string {
  return formatRelativeGap(playerRacer.progress, racers);
}
