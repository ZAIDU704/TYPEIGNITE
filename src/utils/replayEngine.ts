import { RaceReplayData, ReplayKeyframe, Racer } from '../types/game';

const LATEST_REPLAY_KEY = 'typing_rush_latest_replay_v1';
const REPLAYS_LIST_KEY = 'typing_rush_replays_history_v1';

export function saveRaceReplay(replay: RaceReplayData): void {
  if (typeof window === 'undefined') return;
  try {
    // 1. Save as latest replay
    localStorage.setItem(LATEST_REPLAY_KEY, JSON.stringify(replay));

    // 2. Keep up to 5 recent replays in history list
    const existingRaw = localStorage.getItem(REPLAYS_LIST_KEY);
    let list: RaceReplayData[] = existingRaw ? JSON.parse(existingRaw) : [];
    list = [replay, ...list.filter((r) => r.id !== replay.id)].slice(0, 5);
    localStorage.setItem(REPLAYS_LIST_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save race replay to localStorage:', e);
  }
}

export function getLatestReplay(): RaceReplayData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LATEST_REPLAY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function getStoredReplaysList(): RaceReplayData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REPLAYS_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function resetStoredReplays(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LATEST_REPLAY_KEY);
    localStorage.removeItem(REPLAYS_LIST_KEY);
  } catch (e) {
    // ignore
  }
}

export interface InterpolatedReplayState {
  racers: Racer[];
  userInput: string;
  currentSentence: string;
  announcementText?: string;
  announcementLang?: any;
  elapsedSeconds: number;
}

/**
 * Interpolates race state at any arbitrary playback time t (0 to durationSeconds).
 * Accurately reproduces racer positions, speeds, ranks, and typed sentences.
 */
export function interpolateReplayAtTime(
  replay: RaceReplayData,
  timeSec: number
): InterpolatedReplayState {
  const keyframes = replay.keyframes;
  if (!keyframes || keyframes.length === 0) {
    return {
      racers: [],
      userInput: '',
      currentSentence: '',
      elapsedSeconds: timeSec,
    };
  }

  const clampedTime = Math.max(0, Math.min(replay.durationSeconds, timeSec));

  // Find surrounding keyframes
  let prevIdx = 0;
  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].t <= clampedTime) {
      prevIdx = i;
    } else {
      break;
    }
  }

  const kPrev = keyframes[prevIdx];
  const nextIdx = Math.min(keyframes.length - 1, prevIdx + 1);
  const kNext = keyframes[nextIdx];

  const timeDiff = kNext.t - kPrev.t;
  const factor = timeDiff > 0.0001 ? Math.min(1, Math.max(0, (clampedTime - kPrev.t) / timeDiff)) : 0;

  // Interpolate each racer's position
  const interpolatedRacers: Racer[] = kPrev.racers.map((prevRacer) => {
    const nextRacer = kNext.racers.find((r) => r.id === prevRacer.id) || prevRacer;
    const progress = prevRacer.progress + (nextRacer.progress - prevRacer.progress) * factor;
    const wpm = Math.round(prevRacer.wpm + (nextRacer.wpm - prevRacer.wpm) * factor);
    const rank = factor >= 0.5 ? nextRacer.rank : prevRacer.rank;

    return {
      id: prevRacer.id,
      name: prevRacer.id.startsWith('player') ? 'You' : prevRacer.id.replace('bot_', 'Bot ').toUpperCase(),
      isHuman: prevRacer.id.startsWith('player'),
      isSelf: prevRacer.id.startsWith('player'),
      lane: prevRacer.lane,
      color: prevRacer.color,
      carStyle: prevRacer.lane,
      progress,
      currentSpeed: wpm / 10,
      wpm,
      accuracy: 100,
      rank,
      completed: progress >= 100,
    };
  });

  return {
    racers: interpolatedRacers,
    userInput: kPrev.userInput,
    currentSentence: kPrev.currentSentence,
    announcementText: kPrev.announcementText,
    announcementLang: kPrev.announcementLang,
    elapsedSeconds: clampedTime,
  };
}
