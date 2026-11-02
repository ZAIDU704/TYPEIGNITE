import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RaceMode,
  AIDifficulty,
  Racer,
  TypingStats,
  UserPreferences,
  MultiplayerRoomState,
  RivalAnnouncement,
  Achievement,
  RaceReplayData,
  ReplayKeyframe,
  VisualCuesConfig,
} from './types/game';
import { getSentenceAt, createFreshRaceSeed } from './utils/sentences';
import {
  calculateTypingStats,
  updateRacerRanks,
  getLeaderGapText,
  StrictTypingState,
  createInitialStrictTypingState,
  processStrictCharacterKey,
  processStrictBackspace,
} from './utils/typingEngine';
import { CarPhysicsState, RacePhase } from './utils/carPhysics';
import { rivalVoice } from './utils/rivalVoice';
import { multiplayerClient } from './services/multiplayerClient';
import {
  getStoredAchievements,
  saveAchievements,
  evaluateAchievements,
  resetStoredAchievements,
} from './utils/achievements';
import {
  saveRaceReplay,
  getLatestReplay,
  getStoredReplaysList,
  resetStoredReplays,
} from './utils/replayEngine';
import { Track3D, TypingImpulseEvent } from './components/Track3D';
import { TypingArea } from './components/TypingArea';
import { RivalVoiceCaption } from './components/RivalVoiceCaption';
import { RaceResults } from './components/RaceResults';
import { SettingsModal } from './components/SettingsModal';
import { AchievementsModal } from './components/AchievementsModal';
import { AchievementToast } from './components/AchievementToast';
import { ReplayPlayer } from './components/ReplayPlayer';
import { ReplaysListModal } from './components/ReplaysListModal';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { HomePage } from './components/HomePage';
import { DeveloperCredit } from './components/DeveloperCredit';
import { ArrowLeft, Volume2, VolumeX, Settings as SettingsIcon, Trophy, Gauge } from 'lucide-react';

const STORAGE_KEY = 'typing_rush_user_prefs_v1';

const DEFAULT_VISUAL_CUES: VisualCuesConfig = {
  cursorStyle: 'pulsing_cyan',
  colorBlindMode: 'off',
  keyGhostFeedback: true,
  speedometerGlow: true,
  fontSize: 'normal',
};

const DEFAULT_PREFS: UserPreferences = {
  username: 'SpeedRacer',
  voiceLanguage: 'english',
  voiceMuted: false,
  bestWpm: 0,
  bestAccuracy: 0,
  totalRaces: 0,
  beginnerTargetWpm: 25,
  visualCues: DEFAULT_VISUAL_CUES,
};

function createStartingGridRacers(username: string): Racer[] {
  return [
    {
      id: 'player_self',
      name: username || 'You',
      isHuman: true,
      isSelf: true,
      lane: 0,
      color: '#ef4444',
      carStyle: 0,
      progress: 0,
      currentSpeed: 0,
      wpm: 0,
      accuracy: 100,
      rank: 1,
      completed: false,
    },
    {
      id: 'bot_turbo',
      name: 'Apex GT',
      isHuman: false,
      isSelf: false,
      lane: 1,
      color: '#3b82f6',
      carStyle: 1,
      progress: 0,
      currentSpeed: 0,
      wpm: 0,
      accuracy: 96,
      rank: 2,
      completed: false,
    },
    {
      id: 'bot_flash',
      name: 'Vortex RS',
      isHuman: false,
      isSelf: false,
      lane: 2,
      color: '#10b981',
      carStyle: 2,
      progress: 0,
      currentSpeed: 0,
      wpm: 0,
      accuracy: 94,
      rank: 3,
      completed: false,
    },
    {
      id: 'bot_apex',
      name: 'Solaris V8',
      isHuman: false,
      isSelf: false,
      lane: 3,
      color: '#f59e0b',
      carStyle: 3,
      progress: 0,
      currentSpeed: 0,
      wpm: 0,
      accuracy: 91,
      rank: 4,
      completed: false,
    },
  ];
}

export default function App() {
  // --- Persistent Preferences (LocalStorage) ---
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...DEFAULT_PREFS,
            ...parsed,
            visualCues: { ...DEFAULT_VISUAL_CUES, ...(parsed.visualCues || {}) },
          };
        }
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_PREFS;
  });

  const updatePreferences = (updated: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      if (updated.username) {
        setRacers((curr) =>
          curr.map((r) => (r.isSelf ? { ...r, name: updated.username! } : r))
        );
      }
      return next;
    });
  };

  // --- Achievements State ---
  const [achievements, setAchievements] = useState<Achievement[]>(() => getStoredAchievements());
  const [activeToastAchievement, setActiveToastAchievement] = useState<Achievement | null>(null);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [newlyUnlockedInRace, setNewlyUnlockedInRace] = useState<Achievement[]>([]);

  // --- Replays & Navigation State ---
  const [currentScreen, setCurrentScreen] = useState<'home' | 'racing' | 'multiplayer_lobby' | 'replay'>('home');
  const [showReplaysModal, setShowReplaysModal] = useState(false);
  const [activeReplay, setActiveReplay] = useState<RaceReplayData | null>(null);
  const replayKeyframesRef = useRef<ReplayKeyframe[]>([]);

  // --- Modals & Notifications ---
  const [showSettings, setShowSettings] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isPersonalBest, setIsPersonalBest] = useState(false);
  const [networkBanner, setNetworkBanner] = useState<string | null>(null);

  // --- Race Setup & Phase ---
  const [raceMode, setRaceMode] = useState<RaceMode>('single');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('beginner');
  const aiDifficultyRef = useRef<AIDifficulty>(aiDifficulty);
  aiDifficultyRef.current = aiDifficulty;
  const raceModeRef = useRef<RaceMode>(raceMode);
  raceModeRef.current = raceMode;
  const [raceSeed, setRaceSeed] = useState<number>(42);
  const [countdown, setCountdown] = useState<number | 'GO!' | null>(null);
  const [isRaceActive, setIsRaceActive] = useState(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Sentence & Typing Engine State ---
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [currentSentence, setCurrentSentence] = useState('');
  const [userInput, setUserInput] = useState('');
  const [correctCharsTotal, setCorrectCharsTotal] = useState(0);
  const [incorrectCharsTotal, setIncorrectCharsTotal] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [backspacesTotal, setBackspacesTotal] = useState(0);
  const [completedWordsTotal, setCompletedWordsTotal] = useState(0);
  const [completedSentencesTotal, setCompletedSentencesTotal] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorFlashSeq, setErrorFlashSeq] = useState(0);
  const [lastRejectedChar, setLastRejectedChar] = useState<string | null>(null);

  const raceSeedRef = useRef<number>(42);
  raceSeedRef.current = raceSeed;
  const strictStateRef = useRef<StrictTypingState>(createInitialStrictTypingState(''));

  // --- Typing Impulse for Natural Car Acceleration ---
  const [typingImpulse, setTypingImpulse] = useState<TypingImpulseEvent | undefined>(undefined);
  const impulseSeqRef = useRef(0);

  // --- 4 Racers Live State (Initialized Immediately for Home Screen 3D Grid) ---
  const [racers, setRacers] = useState<Racer[]>(() =>
    createStartingGridRacers(preferences.username)
  );
  const racersRef = useRef<Racer[]>(racers);
  racersRef.current = racers;

  // --- RIVAL VOICE State ---
  const [activeAnnouncement, setActiveAnnouncement] = useState<RivalAnnouncement | null>(null);
  const activeAnnouncementRef = useRef<RivalAnnouncement | null>(null);
  activeAnnouncementRef.current = activeAnnouncement;

  const previousPlayerRank = useRef<number>(1);
  const hadComebackRef = useRef<boolean>(false);
  const lastRankVoiceTimeRef = useRef<number>(0);

  // --- Multiplayer State ---
  const [multiplayerRoom, setMultiplayerRoom] = useState<MultiplayerRoomState | null>(null);
  const [selfPlayerId] = useState<string>(() => 'player_' + Math.random().toString(36).substring(2, 9));
  const multiplayerUnsubscribersRef = useRef<Array<() => void>>([]);

  // Sync document.body.dataset.state for automated testing and diagnostics
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (currentScreen === 'home') {
      document.body.dataset.state = 'title';
    } else if (showResults) {
      document.body.dataset.state = 'gameover';
    } else if (currentScreen === 'racing') {
      document.body.dataset.state = 'playing';
    } else {
      document.body.dataset.state = currentScreen;
    }
  }, [currentScreen, showResults]);

  // Initialize RIVAL VOICE listener
  useEffect(() => {
    rivalVoice.setAnnouncementCallback((ann) => {
      setActiveAnnouncement(ann);
    });
  }, []);

  // Check URL query parameters for ?room=CODE or ?autostart=1
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      handleJoinMultiplayer(roomParam.toUpperCase());
    } else if (params.get('autostart') === '1') {
      startSinglePlayerRace('beginner');
    }
  }, []);

  // Compute live stats
  const liveStats: TypingStats = calculateTypingStats(
    correctCharsTotal,
    incorrectCharsTotal,
    totalKeystrokes,
    backspacesTotal,
    completedSentencesTotal,
    completedWordsTotal,
    elapsedSeconds
  );

  // Target race duration = 120 seconds
  const remainingTime = Math.max(0, 120 - elapsedSeconds);

  // Trigger achievement toast
  const triggerAchievementToast = (ach: Achievement) => {
    setActiveToastAchievement(ach);
    setTimeout(() => {
      setActiveToastAchievement((prev) => (prev?.id === ach.id ? null : prev));
    }, 4500);
  };

  const handleResetData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      resetStoredAchievements();
      resetStoredReplays();
    } catch (e) {
      // ignore
    }
    setPreferences(DEFAULT_PREFS);
    setAchievements(getStoredAchievements());
    setRacers(createStartingGridRacers(DEFAULT_PREFS.username));
  };

  // --- Start Single Player Race ---
  const startSinglePlayerRace = (difficultyOverride?: AIDifficulty) => {
    const chosenDiff = difficultyOverride || aiDifficulty;
    setRaceMode('single');
    raceModeRef.current = 'single';
    setAiDifficulty(chosenDiff);
    aiDifficultyRef.current = chosenDiff;

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    const newSeed = createFreshRaceSeed();
    setRaceSeed(newSeed);
    raceSeedRef.current = newSeed;

    const initialSentence = getSentenceAt(0, newSeed, chosenDiff);
    strictStateRef.current = createInitialStrictTypingState(initialSentence);
    setSentenceIndex(0);
    setCurrentSentence(initialSentence);
    setUserInput('');
    setCorrectCharsTotal(0);
    setIncorrectCharsTotal(0);
    setTotalKeystrokes(0);
    setBackspacesTotal(0);
    setCompletedWordsTotal(0);
    setCompletedSentencesTotal(0);
    setElapsedSeconds(0);
    setErrorFlashSeq(0);
    setLastRejectedChar(null);
    setShowResults(false);
    setIsPersonalBest(false);
    setNewlyUnlockedInRace([]);
    setTypingImpulse(undefined);
    hadComebackRef.current = false;

    // Reset replay recording buffer
    replayKeyframesRef.current = [];

    // Reset all 4 cars cleanly at the starting grid
    const initialRacers = createStartingGridRacers(preferences.username);
    setRacers(initialRacers);
    setCurrentScreen('racing');
    previousPlayerRank.current = 1;

    // Start 3.. 2.. 1.. GO! countdown
    setCountdown(3);
    setIsRaceActive(false);

    let count = 3;
    const cdTimer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else if (count === 0) {
        setCountdown('GO!');
        setIsRaceActive(true);
      } else {
        clearInterval(cdTimer);
        countdownIntervalRef.current = null;
        setCountdown(null);
      }
    }, 1000);
    countdownIntervalRef.current = cdTimer;
  };

  // --- Physics Sync Callback from Track3D ---
  const handlePhysicsUpdate = useCallback(
    (states: CarPhysicsState[]) => {
      if (!isRaceActive) return;

      setRacers((prev) => {
        const updated = prev.map((racer) => {
          const phys = states.find((s) => s.lane === racer.lane) || states[racer.lane];
          if (!phys) return racer;

          // Convert m/s to km/h for telemetry display
          const speedKmh = Math.round(phys.currentSpeed * 7.2);

          if (racer.isSelf) {
            return {
              ...racer,
              progress: phys.progress,
              currentSpeed: speedKmh,
            };
          }

          // For AI opponents in single-player, sync both progress and equivalent WPM from smooth physics
          if (raceMode === 'single') {
            const minWpm = aiDifficulty === 'beginner' ? 5 : 18;
            const equivalentWpm = Math.max(
              minWpm,
              aiDifficulty === 'beginner'
                ? Math.round(phys.aiTargetWpm)
                : Math.round(phys.currentSpeed * 2.5)
            );
            return {
              ...racer,
              progress: phys.progress,
              currentSpeed: speedKmh,
              wpm: equivalentWpm,
            };
          }

          return {
            ...racer,
            currentSpeed: speedKmh,
          };
        });

        const ranked = updateRacerRanks(updated);

        // Evaluate rank changes for RIVAL VOICE™ reactions (throttled so it sounds natural)
        const now = performance.now();
        const player = ranked.find((r) => r.isSelf);
        if (player && now - lastRankVoiceTimeRef.current > 4500) {
          if (previousPlayerRank.current === 4 && player.rank < 4) {
            hadComebackRef.current = true;
          }

          if (player.rank < previousPlayerRank.current) {
            lastRankVoiceTimeRef.current = now;
            if (player.rank === 1) {
              rivalVoice.trigger('lead_taken', preferences.voiceLanguage, preferences.voiceMuted);
            } else {
              rivalVoice.trigger('nice_overtake', preferences.voiceLanguage, preferences.voiceMuted);
            }
          } else if (player.rank > previousPlayerRank.current) {
            lastRankVoiceTimeRef.current = now;
            rivalVoice.trigger('overtaken', preferences.voiceLanguage, preferences.voiceMuted);
          }
          previousPlayerRank.current = player.rank;
        }

        if (raceMode === 'multiplayer' && player) {
          multiplayerClient.updateProgress(player.progress, player.wpm, player.accuracy);
        }

        return ranked;
      });
    },
    [isRaceActive, raceMode, preferences.voiceLanguage, preferences.voiceMuted]
  );

  // --- Multiplayer Socket Handlers ---
  const showMultiplayerError = (msg: string) => {
    setNetworkBanner(msg);
    setTimeout(() => setNetworkBanner(null), 4500);
  };

  const clearMultiplayerListeners = () => {
    multiplayerUnsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
    multiplayerUnsubscribersRef.current = [];
  };

  const registerMultiplayerListeners = (showLobbyOnUpdate: boolean) => {
    clearMultiplayerListeners();

    multiplayerUnsubscribersRef.current = [
      multiplayerClient.on('room_joined', (data) => {
        setMultiplayerRoom(data.roomState);
        setCurrentScreen('multiplayer_lobby');
      }),

      multiplayerClient.on('room_updated', (data) => {
        setMultiplayerRoom(data.roomState);
        if (showLobbyOnUpdate) {
          setCurrentScreen('multiplayer_lobby');
        }
      }),

      multiplayerClient.on('countdown_start', (data) => {
        setCountdown(data.countdown);
      }),

      multiplayerClient.on('countdown_tick', (data) => {
        setCountdown(data.countdown);
      }),

      multiplayerClient.on('race_started', (data) => {
        setCountdown(null);
        startMultiplayerRaceSession(data.roomState);
      }),

      multiplayerClient.on('progress_broadcast', (data) => {
        setRacers((prev) =>
          prev.map((racer) => {
            if (racer.id === data.playerId) {
              return {
                ...racer,
                progress: data.progress,
                wpm: data.wpm,
                accuracy: data.accuracy,
                rank: data.rank,
              };
            }
            return racer;
          })
        );
      }),

      multiplayerClient.on('player_left', (data) => {
        setMultiplayerRoom(data.roomState);
      }),

      multiplayerClient.on('error', (err) => {
        showMultiplayerError(err.message || 'Multiplayer error');
      }),
    ];
  };

  const handleCreateMultiplayer = async () => {
    try {
      await multiplayerClient.connect();
      registerMultiplayerListeners(false);
      multiplayerClient.createRoom(selfPlayerId, preferences.username);
    } catch (err) {
      showMultiplayerError('Could not connect to multiplayer server. Please try again.');
    }
  };

  const handleJoinMultiplayer = async (roomCode: string) => {
    try {
      await multiplayerClient.connect();
      registerMultiplayerListeners(true);
      multiplayerClient.joinRoom(roomCode, selfPlayerId, preferences.username);
    } catch (err) {
      showMultiplayerError('Could not connect to multiplayer server.');
    }
  };

  const startMultiplayerRaceSession = (roomState: MultiplayerRoomState) => {
    setRaceMode('multiplayer');
    const newSeed = roomState.seed || 100;
    setRaceSeed(newSeed);
    raceSeedRef.current = newSeed;

    const initialSentence = getSentenceAt(0, newSeed);
    strictStateRef.current = createInitialStrictTypingState(initialSentence);
    setSentenceIndex(0);
    setCurrentSentence(initialSentence);
    setUserInput('');
    setCorrectCharsTotal(0);
    setIncorrectCharsTotal(0);
    setTotalKeystrokes(0);
    setBackspacesTotal(0);
    setCompletedWordsTotal(0);
    setCompletedSentencesTotal(0);
    setElapsedSeconds(0);
    setErrorFlashSeq(0);
    setLastRejectedChar(null);
    setShowResults(false);
    setTypingImpulse(undefined);
    replayKeyframesRef.current = [];

    const playerEntries = Object.values(roomState.players);
    const newRacers: Racer[] = playerEntries.map((p) => ({
      id: p.id,
      name: p.name,
      isHuman: true,
      isSelf: p.id === selfPlayerId,
      lane: p.lane,
      color: p.color,
      carStyle: p.lane,
      progress: 0,
      currentSpeed: 0,
      wpm: 0,
      accuracy: 100,
      rank: p.rank,
      completed: false,
    }));

    setRacers(newRacers);
    setCurrentScreen('racing');
    setIsRaceActive(true);
  };

  // --- Race Timer (120s) & Replay Keyframe Recorder ---
  useEffect(() => {
    if (!isRaceActive) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;

        // Record keyframe for 100% faithful replay reproduction
        const racersSnapshot = racersRef.current.map((r) => ({
          id: r.id,
          lane: r.lane,
          color: r.color,
          progress: r.progress,
          wpm: r.wpm,
          rank: r.rank,
        }));

        const keyframe: ReplayKeyframe = {
          t: next,
          racers: racersSnapshot,
          userInput,
          currentSentence,
          announcementText: activeAnnouncementRef.current?.text,
          announcementLang: activeAnnouncementRef.current?.language,
        };
        replayKeyframesRef.current.push(keyframe);

        if (next >= 120) {
          clearInterval(timer);
          finishRace();
          return 120;
        }

        // Voice Announcer Milestones
        if (next === 90) {
          rivalVoice.trigger('final_stretch', preferences.voiceLanguage, preferences.voiceMuted);
        } else if (next === 110) {
          rivalVoice.trigger('ten_seconds', preferences.voiceLanguage, preferences.voiceMuted, true);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRaceActive, preferences.voiceLanguage, preferences.voiceMuted, userInput, currentSentence]);

  // --- Strict Character-by-Character Typing Handlers (Feeds Smooth Delta-Time Car Physics) ---
  const syncStrictTypingState = useCallback(
    (nextState: StrictTypingState) => {
      strictStateRef.current = nextState;
      setCurrentSentence(nextState.currentSentence);
      setSentenceIndex(nextState.sentenceIndex);
      setUserInput(nextState.userInput);
      setCorrectCharsTotal(nextState.correctCharsTotal);
      setIncorrectCharsTotal(nextState.incorrectCharsTotal);
      setTotalKeystrokes(nextState.totalKeystrokes);
      setBackspacesTotal(nextState.backspacesTotal);
      setCompletedSentencesTotal(nextState.completedSentences);
      setCompletedWordsTotal(nextState.completedWords);

      const updatedStats = calculateTypingStats(
        nextState.correctCharsTotal,
        nextState.incorrectCharsTotal,
        nextState.totalKeystrokes,
        nextState.backspacesTotal,
        nextState.completedSentences,
        nextState.completedWords,
        elapsedSeconds
      );

      setRacers((prev) =>
        prev.map((r) =>
          r.isSelf
            ? {
                ...r,
                wpm: updatedStats.netWpm,
                accuracy: updatedStats.accuracy,
              }
            : r
        )
      );
    },
    [elapsedSeconds]
  );

  const handleCharacterKey = useCallback(
    (char: string) => {
      if (!isRaceActive) return;

      const nextState = processStrictCharacterKey(
        strictStateRef.current,
        char,
        (nextIdx) =>
          getSentenceAt(
            nextIdx,
            raceSeedRef.current,
            raceModeRef.current === 'single' ? aiDifficultyRef.current : undefined
          )
      );

      if (nextState.lastEvent === 'none') return;

      syncStrictTypingState(nextState);

      if (nextState.lastEvent === 'rejected') {
        setLastRejectedChar(nextState.lastRejectedChar);
        setErrorFlashSeq((prev) => prev + 1);
        impulseSeqRef.current += 1;
        setTypingImpulse({
          correctChars: 0,
          incorrectChars: 1,
          seq: impulseSeqRef.current,
        });
      } else if (
        nextState.lastEvent === 'accepted' ||
        nextState.lastEvent === 'sentence_completed'
      ) {
        setLastRejectedChar(null);
        impulseSeqRef.current += 1;
        setTypingImpulse({
          correctChars: nextState.speedBoostChars,
          incorrectChars: 0,
          seq: impulseSeqRef.current,
        });
      }
    },
    [isRaceActive, syncStrictTypingState]
  );

  const handleBackspace = useCallback(() => {
    if (!isRaceActive) return;

    const nextState = processStrictBackspace(strictStateRef.current);
    if (nextState.lastEvent !== 'backspace') return;

    syncStrictTypingState(nextState);

    impulseSeqRef.current += 1;
    setTypingImpulse({
      correctChars: nextState.progressDeltaChars, // -1
      incorrectChars: 0,
      seq: impulseSeqRef.current,
    });
  }, [isRaceActive, syncStrictTypingState]);

  // --- Finish Race, Evaluate Achievements, and Save Replay ---
  const finishRace = () => {
    setIsRaceActive(false);
    rivalVoice.trigger('race_finish', preferences.voiceLanguage, preferences.voiceMuted, true);

    const finalNetWpm = liveStats.netWpm;
    const finalAccuracy = liveStats.accuracy;
    const isPB = finalNetWpm > preferences.bestWpm;
    setIsPersonalBest(isPB);

    const newTotalRaces = preferences.totalRaces + 1;
    updatePreferences({
      bestWpm: Math.max(preferences.bestWpm, finalNetWpm),
      bestAccuracy: Math.max(preferences.bestAccuracy, finalAccuracy),
      totalRaces: newTotalRaces,
    });

    const playerRacerObj = racersRef.current.find((r) => r.isSelf) || racersRef.current[0];
    const playerRank = playerRacerObj?.rank || 4;

    // 1. Evaluate and Save Achievements locally
    const { updatedList, newlyUnlocked } = evaluateAchievements(achievements, {
      stats: liveStats,
      playerRank,
      totalRaces: newTotalRaces,
      language: preferences.voiceLanguage,
      hadComeback: hadComebackRef.current,
    });

    setAchievements(updatedList);
    saveAchievements(updatedList);

    if (newlyUnlocked.length > 0) {
      setNewlyUnlockedInRace(newlyUnlocked);
      triggerAchievementToast(newlyUnlocked[0]);
    }

    // 2. Assemble and Save Replay locally
    const replayData: RaceReplayData = {
      id: 'replay_' + Date.now(),
      date: Date.now(),
      mode: raceMode,
      difficulty: aiDifficulty,
      seed: raceSeed,
      finalStats: liveStats,
      playerRank,
      durationSeconds: elapsedSeconds || 120,
      keyframes: [...replayKeyframesRef.current],
    };

    saveRaceReplay(replayData);
    setActiveReplay(replayData);

    setShowResults(true);
  };

  const handleReturnHome = () => {
    rivalVoice.stopAll();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    setIsRaceActive(false);
    setShowResults(false);
    setTypingImpulse(undefined);
    if (raceMode === 'multiplayer') {
      multiplayerClient.leaveRoom();
      clearMultiplayerListeners();
    }
    setRacers(createStartingGridRacers(preferences.username));
    setCurrentScreen('home');
  };

  const handleRaceAgain = () => {
    rivalVoice.stopAll();
    setShowResults(false);
    if (raceMode === 'single') {
      startSinglePlayerRace(aiDifficulty);
    } else {
      setCurrentScreen('multiplayer_lobby');
    }
  };

  const handleWatchReplay = (targetReplay?: RaceReplayData) => {
    const replayToPlay = targetReplay || activeReplay || getLatestReplay();
    if (replayToPlay) {
      rivalVoice.stopAll();
      setShowResults(false);
      setActiveReplay(replayToPlay);
      setCurrentScreen('replay');
    }
  };

  const playerRacer = racers.find((r) => r.isSelf) || racers[0];
  const leadGapText = playerRacer ? getLeaderGapText(playerRacer, racers) : 'Waiting...';

  // Determine 3D Track phase
  const trackPhase: RacePhase =
    currentScreen === 'home'
      ? 'idle'
      : countdown !== null && countdown !== 'GO!'
      ? 'countdown'
      : isRaceActive
      ? 'racing'
      : 'finished';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Non-blocking Network Banner */}
      {networkBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-rose-950/95 border border-rose-500 text-rose-200 text-xs font-bold shadow-2xl">
          {networkBanner}
        </div>
      )}

      {/* Persistent 3D Speedway Stage for Home & Racing Views */}
      {(currentScreen === 'home' || currentScreen === 'racing') && (
        <div
          className={
            currentScreen === 'home'
              ? 'fixed inset-0 w-screen h-screen overflow-hidden'
              : 'min-h-screen h-screen overflow-y-auto flex flex-col gap-2 px-2 py-1.5 sm:px-4 sm:py-2.5 max-w-[1480px] mx-auto w-full relative'
          }
        >
          {/* Racing Top Header Controls Bar (Only in Racing View) */}
          {currentScreen === 'racing' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-2 shrink-0">
              <div className="flex items-center justify-between lg:justify-start space-x-3">
                <button
                  onClick={handleReturnHome}
                  className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Exit Race</span>
                </button>

                <span className="text-xs font-bold uppercase tracking-wider text-[#FFC247]">
                  {raceMode === 'single'
                    ? aiDifficulty === 'beginner'
                      ? `TypeIgnite • Beginner (Target ${preferences.beginnerTargetWpm ?? 25} WPM)`
                      : `TypeIgnite • Single Player (${aiDifficulty.toUpperCase()})`
                    : 'TypeIgnite • Multiplayer'}
                </span>
              </div>

              {/* Top-Centre Developer Credit */}
              <div className="flex justify-center">
                <DeveloperCredit compact />
              </div>

              <div className="flex items-center justify-end space-x-2">
                {playerRacer && (
                  <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono-racing text-cyan-300">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{playerRacer.currentSpeed || 0} KM/H</span>
                  </div>
                )}

                <button
                  onClick={() => setShowAchievementsModal(true)}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                  title="Trophy Room"
                  aria-label="Trophy Room"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  onClick={() => updatePreferences({ voiceMuted: !preferences.voiceMuted })}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  aria-label={preferences.voiceMuted ? 'Unmute voice' : 'Mute voice'}
                  title={preferences.voiceMuted ? 'Unmute' : 'Mute'}
                >
                  {preferences.voiceMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                </button>

                <button
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Settings"
                  aria-label="Settings"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Persistent 3D Track Wrapper (Stays Mounted Across Home -> Race Transition, Enlarged to Fill Available Space in Racing View) */}
          <div
            data-testid="racing-stage-container"
            className={
              currentScreen === 'home'
                ? 'w-full h-full relative'
                : 'w-full flex-1 min-h-[340px] sm:min-h-[450px] md:min-h-[510px] lg:min-h-[560px] relative'
            }
          >
            <Track3D
              racers={racers}
              playerLane={playerRacer?.lane ?? 0}
              phase={trackPhase}
              typingImpulse={typingImpulse}
              aiDifficulty={aiDifficulty}
              beginnerTargetWpm={preferences.beginnerTargetWpm ?? 25}
              fullViewport={currentScreen === 'home'}
              onPhysicsUpdate={handlePhysicsUpdate}
            />

            {/* 3.. 2.. 1.. GO! Countdown Overlay (No backdrop-blur over WebGL) */}
            {currentScreen === 'racing' && countdown !== null && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/55 pointer-events-none">
                <div className="text-center">
                  <div className="font-mono-racing text-7xl sm:text-8xl font-black text-[#FFC247] drop-shadow-[0_10px_25px_rgba(255,112,67,0.65)]">
                    {countdown}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-[#F8FAFC] mt-2">
                    {countdown === 'GO!'
                      ? 'TYPEIGNITE — TYPE WITH FIRE!'
                      : 'TYPEIGNITE GRID — GET READY!'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Home Screen Minimal Overlay */}
          {currentScreen === 'home' && (
            <HomePage
              onStartSinglePlayer={startSinglePlayerRace}
              onCreateMultiplayer={handleCreateMultiplayer}
              onJoinMultiplayer={handleJoinMultiplayer}
              onOpenSettings={() => setShowSettings(true)}
              onOpenAchievements={() => setShowAchievementsModal(true)}
              onOpenReplays={() => setShowReplaysModal(true)}
              guestName={preferences.username}
              aiDifficulty={aiDifficulty}
              onChangeDifficulty={(diff) => setAiDifficulty(diff)}
              beginnerTargetWpm={preferences.beginnerTargetWpm ?? 25}
              onChangeBeginnerTargetWpm={(wpm) => updatePreferences({ beginnerTargetWpm: wpm })}
            />
          )}

          {/* Racing HUD Bottom Section */}
          {currentScreen === 'racing' && (
            <div className="shrink-0 space-y-1.5">
              <RivalVoiceCaption
                announcement={activeAnnouncement}
                muted={preferences.voiceMuted}
                onToggleMute={() => updatePreferences({ voiceMuted: !preferences.voiceMuted })}
              />

              <TypingArea
                currentSentence={currentSentence}
                userInput={userInput}
                onCharacterKey={handleCharacterKey}
                onBackspace={handleBackspace}
                errorFlashSeq={errorFlashSeq}
                lastRejectedChar={lastRejectedChar}
                stats={liveStats}
                remainingTime={remainingTime}
                isActive={isRaceActive}
                leadGapText={leadGapText}
                visualCues={preferences.visualCues}
              />
            </div>
          )}
        </div>
      )}

      {/* View 2: Multiplayer Waiting Room / Lobby */}
      {currentScreen === 'multiplayer_lobby' && multiplayerRoom && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <MultiplayerLobby
            roomState={multiplayerRoom}
            selfPlayerId={selfPlayerId}
            onToggleReady={() => multiplayerClient.toggleReady()}
            onStartRace={() => multiplayerClient.startRace()}
            onLeaveRoom={handleReturnHome}
          />
        </div>
      )}

      {/* View 4: 3D Race Replay Player */}
      {currentScreen === 'replay' && activeReplay && (
        <ReplayPlayer replay={activeReplay} onExit={handleReturnHome} />
      )}

      {/* Race Results Screen Modal */}
      {showResults && playerRacer && (
        <RaceResults
          playerRacer={playerRacer}
          allRacers={racers}
          stats={liveStats}
          isPersonalBest={isPersonalBest}
          newlyUnlockedAchievements={newlyUnlockedInRace}
          onRaceAgain={handleRaceAgain}
          onReturnHome={handleReturnHome}
          onWatchReplay={activeReplay ? () => handleWatchReplay(activeReplay) : undefined}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          preferences={preferences}
          aiDifficulty={aiDifficulty}
          onChangeDifficulty={(diff) => setAiDifficulty(diff)}
          onUpdatePreferences={updatePreferences}
          onResetData={handleResetData}
          onOpenAchievements={() => setShowAchievementsModal(true)}
          onOpenReplays={() => setShowReplaysModal(true)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Achievements Trophy Room Modal */}
      {showAchievementsModal && (
        <AchievementsModal
          achievements={achievements}
          onClose={() => setShowAchievementsModal(false)}
        />
      )}

      {/* Replays History Modal */}
      {showReplaysModal && (
        <ReplaysListModal
          replays={getStoredReplaysList()}
          onSelectReplay={(rep) => {
            setShowReplaysModal(false);
            handleWatchReplay(rep);
          }}
          onClose={() => setShowReplaysModal(false)}
        />
      )}

      {/* Real-time Achievement Unlocked Toast Notification */}
      <AchievementToast
        achievement={activeToastAchievement}
        onDismiss={() => setActiveToastAchievement(null)}
      />
    </div>
  );
}
