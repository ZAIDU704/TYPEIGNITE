import { Achievement, TypingStats, VoiceLanguage } from '../types/game';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_race',
    title: 'Grid Rookie',
    description: 'Complete your first race on the 3D speedway.',
    icon: '🏁',
    category: 'racing',
    unlocked: false,
  },
  {
    id: 'first_win',
    title: 'Champion of the Track',
    description: 'Win 1st place in a race against tough competitors.',
    icon: '🏆',
    category: 'racing',
    unlocked: false,
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Break the speed barrier with 60+ Net WPM in a race.',
    icon: '⚡',
    category: 'speed',
    unlocked: false,
  },
  {
    id: 'nitro_typer',
    title: 'Supersonic Typer',
    description: 'Unleash blistering pace with 90+ Net WPM.',
    icon: '🚀',
    category: 'speed',
    unlocked: false,
  },
  {
    id: 'flawless',
    title: 'Laser Precision',
    description: 'Finish a race with 100% accuracy (minimum 20 words).',
    icon: '🎯',
    category: 'accuracy',
    unlocked: false,
  },
  {
    id: 'comeback_king',
    title: 'Comeback King',
    description: 'Climb back from 4th place to take a podium finish.',
    icon: '👑',
    category: 'racing',
    unlocked: false,
  },
  {
    id: 'marathon',
    title: 'Speedway Veteran',
    description: 'Complete 5 intense races on the asphalt.',
    icon: '🔥',
    category: 'endurance',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: 'polyglot',
    title: 'Polyglot Racer',
    description: 'Tune into RIVAL VOICE™ in Urdu or Roman Urdu.',
    icon: '🎙️',
    category: 'special',
    unlocked: false,
  },
  {
    id: 'century',
    title: 'Century Club',
    description: 'Type 100 or more total words in a single race.',
    icon: '💯',
    category: 'speed',
    unlocked: false,
  },
  {
    id: 'perfectionist',
    title: 'Zero Blunders',
    description: 'Complete a race with zero backspaces and zero errors.',
    icon: '✨',
    category: 'accuracy',
    unlocked: false,
  },
];

const STORAGE_KEY = 'typing_rush_achievements_v1';

export function getStoredAchievements(): Achievement[] {
  if (typeof window === 'undefined') return INITIAL_ACHIEVEMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_ACHIEVEMENTS;
    const parsed: Record<string, Partial<Achievement>> = JSON.parse(raw);
    return INITIAL_ACHIEVEMENTS.map((def) => {
      const saved = parsed[def.id];
      if (!saved) return def;
      return {
        ...def,
        unlocked: !!saved.unlocked,
        unlockedAt: saved.unlockedAt,
        progress: saved.progress ?? def.progress,
      };
    });
  } catch (e) {
    return INITIAL_ACHIEVEMENTS;
  }
}

export function saveAchievements(achievements: Achievement[]): void {
  if (typeof window === 'undefined') return;
  try {
    const map: Record<string, { unlocked: boolean; unlockedAt?: number; progress?: number }> = {};
    for (const a of achievements) {
      if (a.unlocked || (a.progress !== undefined && a.progress > 0)) {
        map[a.id] = {
          unlocked: a.unlocked,
          unlockedAt: a.unlockedAt,
          progress: a.progress,
        };
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    // ignore
  }
}

export interface AchievementEvaluationContext {
  stats: TypingStats;
  playerRank: number;
  totalRaces: number;
  language: VoiceLanguage;
  hadComeback: boolean;
}

/**
 * Pure evaluation function: checks which achievements become newly unlocked.
 * Returns { updatedList, newlyUnlocked }.
 */
export function evaluateAchievements(
  current: Achievement[],
  ctx: AchievementEvaluationContext
): { updatedList: Achievement[]; newlyUnlocked: Achievement[] } {
  const newlyUnlocked: Achievement[] = [];
  const now = Date.now();

  const updatedList = current.map((item) => {
    if (item.unlocked) return item;

    let shouldUnlock = false;
    let nextProgress = item.progress;

    switch (item.id) {
      case 'first_race':
        shouldUnlock = ctx.stats.completedWords >= 1 || ctx.stats.elapsedSeconds >= 10;
        break;
      case 'first_win':
        shouldUnlock = ctx.playerRank === 1;
        break;
      case 'speed_demon':
        shouldUnlock = ctx.stats.netWpm >= 60;
        break;
      case 'nitro_typer':
        shouldUnlock = ctx.stats.netWpm >= 90;
        break;
      case 'flawless':
        shouldUnlock = ctx.stats.accuracy === 100 && ctx.stats.completedWords >= 20;
        break;
      case 'comeback_king':
        shouldUnlock = ctx.hadComeback && ctx.playerRank <= 3;
        break;
      case 'marathon':
        nextProgress = Math.min(item.maxProgress || 5, ctx.totalRaces);
        shouldUnlock = (nextProgress ?? 0) >= (item.maxProgress || 5);
        break;
      case 'polyglot':
        shouldUnlock = ctx.language === 'urdu' || ctx.language === 'roman_urdu';
        break;
      case 'century':
        shouldUnlock = ctx.stats.completedWords >= 100;
        break;
      case 'perfectionist':
        shouldUnlock = ctx.stats.incorrectChars === 0 && ctx.stats.backspaces === 0 && ctx.stats.completedWords >= 15;
        break;
    }

    if (shouldUnlock) {
      const unlockedItem = {
        ...item,
        unlocked: true,
        unlockedAt: now,
        progress: item.maxProgress,
      };
      newlyUnlocked.push(unlockedItem);
      return unlockedItem;
    }

    return nextProgress !== item.progress ? { ...item, progress: nextProgress } : item;
  });

  return { updatedList, newlyUnlocked };
}

export function resetStoredAchievements(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}
