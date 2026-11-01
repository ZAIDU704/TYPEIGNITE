import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_ACHIEVEMENTS, evaluateAchievements } from './achievements';
import { interpolateReplayAtTime } from './replayEngine';
import { RaceReplayData, TypingStats } from '../types/game';

test('evaluateAchievements unlocks Grid Rookie, Champion, and Speed Demon appropriately', () => {
  const dummyStats: TypingStats = {
    grossWpm: 75,
    netWpm: 68,
    accuracy: 98,
    correctChars: 340,
    incorrectChars: 7,
    totalKeystrokes: 347,
    backspaces: 4,
    completedWords: 68,
    completedSentences: 5,
    elapsedSeconds: 120,
  };

  const { updatedList, newlyUnlocked } = evaluateAchievements(INITIAL_ACHIEVEMENTS, {
    stats: dummyStats,
    playerRank: 1,
    totalRaces: 1,
    language: 'english',
    hadComeback: false,
  });

  const unlockedIds = newlyUnlocked.map((a) => a.id);
  assert.ok(unlockedIds.includes('first_race'), 'Should unlock first_race');
  assert.ok(unlockedIds.includes('first_win'), 'Should unlock first_win (rank 1)');
  assert.ok(unlockedIds.includes('speed_demon'), 'Should unlock speed_demon (netWpm 68 >= 60)');
  assert.ok(!unlockedIds.includes('nitro_typer'), 'Should not unlock nitro_typer yet');
});

test('evaluateAchievements handles polyglot and flawless achievements correctly', () => {
  const flawlessStats: TypingStats = {
    grossWpm: 95,
    netWpm: 95,
    accuracy: 100,
    correctChars: 400,
    incorrectChars: 0,
    totalKeystrokes: 400,
    backspaces: 0,
    completedWords: 75,
    completedSentences: 6,
    elapsedSeconds: 120,
  };

  const { newlyUnlocked } = evaluateAchievements(INITIAL_ACHIEVEMENTS, {
    stats: flawlessStats,
    playerRank: 1,
    totalRaces: 3,
    language: 'urdu',
    hadComeback: false,
  });

  const ids = newlyUnlocked.map((a) => a.id);
  assert.ok(ids.includes('flawless'), 'Should unlock flawless (100% accuracy)');
  assert.ok(ids.includes('nitro_typer'), 'Should unlock nitro_typer (95 WPM)');
  assert.ok(ids.includes('polyglot'), 'Should unlock polyglot when language is urdu');
  assert.ok(ids.includes('perfectionist'), 'Should unlock perfectionist (0 errors, 0 backspaces)');
});

test('interpolateReplayAtTime accurately reproduces racer positions and input across time', () => {
  const mockReplay: RaceReplayData = {
    id: 'rep_1',
    date: Date.now(),
    mode: 'single',
    seed: 42,
    finalStats: {
      grossWpm: 60,
      netWpm: 60,
      accuracy: 100,
      correctChars: 300,
      incorrectChars: 0,
      totalKeystrokes: 300,
      backspaces: 0,
      completedWords: 60,
      completedSentences: 4,
      elapsedSeconds: 120,
    },
    playerRank: 1,
    durationSeconds: 120,
    keyframes: [
      {
        t: 0,
        racers: [
          { id: 'player', lane: 0, color: '#ef4444', progress: 0, wpm: 0, rank: 1 },
          { id: 'bot_1', lane: 1, color: '#3b82f6', progress: 0, wpm: 0, rank: 2 },
        ],
        userInput: '',
        currentSentence: 'Start engine',
      },
      {
        t: 10,
        racers: [
          { id: 'player', lane: 0, color: '#ef4444', progress: 20, wpm: 50, rank: 1 },
          { id: 'bot_1', lane: 1, color: '#3b82f6', progress: 10, wpm: 30, rank: 2 },
        ],
        userInput: 'Start',
        currentSentence: 'Start engine',
      },
    ],
  };

  // Check halfway interpolation at t = 5s
  const stateAt5 = interpolateReplayAtTime(mockReplay, 5);
  const playerAt5 = stateAt5.racers.find((r) => r.id === 'player')!;
  const botAt5 = stateAt5.racers.find((r) => r.id === 'bot_1')!;

  assert.equal(playerAt5.progress, 10, 'Player progress should be exactly 10% halfway');
  assert.equal(botAt5.progress, 5, 'Bot progress should be exactly 5% halfway');
  assert.equal(playerAt5.wpm, 25, 'Player WPM should interpolate to 25');
  assert.equal(stateAt5.currentSentence, 'Start engine');
});

test('TypeIgnite brand voice lines and developer credit metadata match official spec', async () => {
  const { DEVELOPER_INFO } = await import('../components/DeveloperCredit');
  const { RIVAL_LINES } = await import('./rivalVoice');

  assert.equal(DEVELOPER_INFO.developerName, 'ZAID BILAL');
  assert.equal(DEVELOPER_INFO.instagramHandle, '@cybergenius.io');
  assert.equal(DEVELOPER_INFO.instagramUrl, 'https://www.instagram.com/cybergenius.io/');
  assert.equal(DEVELOPER_INFO.portfolioLabel, 'Meet the Developer');
  assert.equal(DEVELOPER_INFO.portfolioUrl, 'https://zaidu704.github.io/cybergenius.io/');

  assert.ok(RIVAL_LINES.test_voice.english.includes('TypeIgnite'));
  assert.ok(!RIVAL_LINES.test_voice.english.toLowerCase().includes('typing rush'));
});

