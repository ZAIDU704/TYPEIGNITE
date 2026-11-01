export type RaceMode = 'single' | 'multiplayer';

export type AIDifficulty = 'beginner' | 'rookie' | 'pro' | 'master';

export type VoiceLanguage = 'english' | 'urdu' | 'roman_urdu';

export interface Racer {
  id: string;
  name: string;
  isHuman: boolean;
  isSelf: boolean;
  lane: number; // 0, 1, 2, 3
  color: string;
  carStyle: number;
  progress: number; // 0 to 100% or distance along track
  currentSpeed: number; // visual speed
  wpm: number;
  accuracy: number;
  rank: number; // 1, 2, 3, 4
  completed: boolean;
  finishTime?: number;
}

export interface TypingStats {
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalKeystrokes: number;
  backspaces: number;
  completedWords: number;
  completedSentences: number;
  elapsedSeconds: number;
}

export type CursorStyle = 'pulsing_cyan' | 'high_contrast_underline' | 'block' | 'off';
export type ColorBlindMode = 'off' | 'high_contrast';
export type TypingFontSize = 'normal' | 'large' | 'extra_large';

export interface VisualCuesConfig {
  cursorStyle: CursorStyle;
  colorBlindMode: ColorBlindMode;
  keyGhostFeedback: boolean;
  speedometerGlow: boolean;
  fontSize: TypingFontSize;
}

export interface UserPreferences {
  username: string;
  voiceLanguage: VoiceLanguage;
  voiceMuted: boolean;
  bestWpm: number;
  bestAccuracy: number;
  totalRaces: number;
  beginnerTargetWpm?: number;
  visualCues: VisualCuesConfig;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'speed' | 'accuracy' | 'racing' | 'endurance' | 'special';
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

export interface ReplayKeyframe {
  t: number; // elapsed seconds (e.g. 0.5, 1.0, 1.5...)
  racers: Array<{
    id: string;
    lane: number;
    color: string;
    progress: number;
    wpm: number;
    rank: number;
  }>;
  userInput: string;
  currentSentence: string;
  announcementText?: string;
  announcementLang?: VoiceLanguage;
}

export interface RaceReplayData {
  id: string;
  date: number;
  mode: RaceMode;
  difficulty?: AIDifficulty;
  seed: number;
  finalStats: TypingStats;
  playerRank: number;
  durationSeconds: number;
  keyframes: ReplayKeyframe[];
}

export interface MultiplayerPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  lane: number;
  color: string;
  progress: number;
  wpm: number;
  accuracy: number;
  rank: number;
}

export interface MultiplayerRoomState {
  roomCode: string;
  hostId: string;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  countdown: number;
  players: Record<string, MultiplayerPlayer>;
  seed: number;
  raceStartTime?: number;
}

export interface RivalAnnouncement {
  id: string;
  text: string;
  language: VoiceLanguage;
  speaker: string;
  priority: 'high' | 'normal';
  timestamp: number;
}
