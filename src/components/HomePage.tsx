import React, { useState, useEffect } from 'react';
import { AIDifficulty } from '../types/game';
import { Play, Users, Settings, Zap, X, Gauge } from 'lucide-react';
import { DeveloperCredit } from './DeveloperCredit';

interface HomePageProps {
  onStartSinglePlayer: (difficulty?: AIDifficulty) => void;
  onCreateMultiplayer: () => void;
  onJoinMultiplayer: (roomCode: string) => void;
  onOpenSettings: () => void;
  onOpenAchievements: () => void;
  onOpenReplays: () => void;
  guestName: string;
  aiDifficulty: AIDifficulty;
  onChangeDifficulty: (diff: AIDifficulty) => void;
  beginnerTargetWpm: number;
  onChangeBeginnerTargetWpm: (wpm: number) => void;
}

const BEGINNER_WPM_PRESETS = [15, 20, 25, 30, 40];

export const HomePage: React.FC<HomePageProps> = ({
  onStartSinglePlayer,
  onCreateMultiplayer,
  onJoinMultiplayer,
  onOpenSettings,
  aiDifficulty,
  onChangeDifficulty,
  beginnerTargetWpm,
  onChangeBeginnerTargetWpm,
}) => {
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Allow Enter / Space to start the race when modal is closed and no input is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showMultiplayerModal) return;
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartSinglePlayer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMultiplayerModal, onStartSinglePlayer]);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCodeInput.trim()) {
      setShowMultiplayerModal(false);
      onJoinMultiplayer(joinCodeInput.trim().toUpperCase());
    }
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-7 select-none">
      {/* Subtle Top Vignette for Emblem, Developer Credit & Settings Readability */}
      <div
        className="fixed inset-x-0 top-0 h-36 pointer-events-none -z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(10, 15, 29, 0.78) 0%, rgba(10, 15, 29, 0) 100%)',
        }}
      />
      {/* Subtle Bottom-Left Vignette for Primary Buttons Readability */}
      <div
        className="fixed inset-x-0 bottom-0 h-52 pointer-events-none -z-10"
        style={{
          background:
            'linear-gradient(0deg, rgba(10, 15, 29, 0.85) 0%, rgba(10, 15, 29, 0) 100%)',
        }}
      />

      {/* Top Row: Bespoke TypeIgnite Flame-Speed Emblem (Top-Left), Developer Credit (Top-Centre), Settings Icon (Top-Right) */}
      <header className="w-full grid grid-cols-[1fr_auto] lg:grid-cols-3 items-start gap-2.5">
        {/* Top-Left: TypeIgnite Brand Wordmark & Flame-Speed Crest */}
        <div className="order-1 flex items-center justify-start">
          <div className="pointer-events-auto flex items-center space-x-3">
            {/* Custom SVG TypeIgnite Flame & Speed Crest */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#101827]/95 border border-[#FF7043]/55 flex items-center justify-center shadow-[0_6px_22px_rgba(255,112,67,0.3)] shrink-0">
              <svg
                viewBox="0 0 40 40"
                className="w-7 h-7 sm:w-8 sm:h-8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Dynamic Speed-Flame Bolt + Aerodynamic Car Silhouette */}
                <path
                  d="M22.5 4L10 21H19.5L16.5 35L31 17.5H21.5L22.5 4Z"
                  fill="url(#typeignite_flame_grad)"
                  stroke="#FFC247"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 16H11M2 22H8M5 28H12"
                  stroke="#FFC247"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient
                    id="typeignite_flame_grad"
                    x1="10"
                    y1="4"
                    x2="31"
                    y2="35"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#FFC247" />
                    <stop offset="0.55" stopColor="#FF7043" />
                    <stop offset="1" stopColor="#E11D48" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1
                  data-testid="brand-wordmark"
                  className="font-black text-xl sm:text-3xl tracking-wider uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] text-[#F8FAFC]"
                >
                  <span>TYPE</span>
                  <span className="bg-gradient-to-r from-[#FF7043] to-[#FFC247] bg-clip-text text-transparent">
                    IGNITE
                  </span>
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-mono-racing font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-gradient-to-r from-[#FF7043] to-[#FFC247] text-[#101827] shadow-sm">
                  GT SPEEDWAY
                </span>
              </div>
              <p
                data-testid="brand-tagline"
                className="text-xs sm:text-sm font-semibold text-[#FFC247] tracking-wide drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]"
              >
                Type with Fire. Race to Your Best.
              </p>
            </div>
          </div>
        </div>

        {/* Top-Centre: Developer Identity & Social Links */}
        <div className="order-3 col-span-2 lg:order-2 lg:col-span-1 flex justify-center">
          <DeveloperCredit />
        </div>

        {/* Top-Right: Single Accessible Settings Gear */}
        <div className="order-2 lg:order-3 flex items-center justify-end">
          <div className="pointer-events-auto flex items-center space-x-2">
            <button
              onClick={onOpenSettings}
              className="p-2.5 sm:p-3 rounded-2xl bg-[#101827]/90 hover:bg-slate-900 border border-slate-700/80 text-[#F8FAFC] hover:text-[#FFC247] transition-colors shadow-lg cursor-pointer"
              title="TypeIgnite Settings, Achievements & Replays"
              aria-label="Open Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom-Left Controls: Difficulty Level Selector (Beginner Default + Custom Target WPM) + START & MULTIPLAYER */}
      <div className="w-full flex flex-col items-start gap-2.5">
        {/* Level & Custom Target Speed Bar */}
        <div className="pointer-events-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-2xl bg-[#101827]/90 border border-slate-800/90 shadow-xl max-w-full">
          {/* 4 Difficulty Levels */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5">
              Level:
            </span>
            {(
              [
                { id: 'beginner', label: 'Beginner' },
                { id: 'rookie', label: 'Rookie' },
                { id: 'pro', label: 'Pro' },
                { id: 'master', label: 'Master' },
              ] as const
            ).map((lvl) => {
              const active = aiDifficulty === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => onChangeDifficulty(lvl.id)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#FF7043] to-[#FFC247] text-[#101827] shadow-[0_0_15px_rgba(255,112,67,0.45)]'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>

          {/* Beginner Customizable Target WPM Control */}
          {aiDifficulty === 'beginner' && (
            <div className="flex items-center gap-2 sm:pl-2 sm:border-l border-slate-800 flex-wrap">
              <label
                htmlFor="home-beginner-wpm-input"
                className="flex items-center space-x-1 text-[11px] font-bold text-emerald-400 whitespace-nowrap"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>Target WPM:</span>
              </label>

              <input
                id="home-beginner-wpm-input"
                type="number"
                min={5}
                max={120}
                aria-label="Target WPM"
                value={beginnerTargetWpm}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val)) {
                    onChangeBeginnerTargetWpm(Math.max(5, Math.min(120, val)));
                  }
                }}
                className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-emerald-500/50 text-emerald-300 font-mono-racing font-bold text-xs text-center focus:outline-none focus:border-emerald-400"
              />

              <div className="flex items-center gap-1">
                {BEGINNER_WPM_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onChangeBeginnerTargetWpm(preset)}
                    className={`px-2 py-1 rounded-lg font-mono-racing text-[11px] font-bold transition-colors cursor-pointer ${
                      beginnerTargetWpm === preset
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom-Left: ONLY START & MULTIPLAYER Primary Buttons */}
        <div className="pointer-events-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
          <button
            data-start="true"
            onClick={() => onStartSinglePlayer()}
            className="group relative px-9 py-4 rounded-2xl bg-gradient-to-r from-[#FF7043] via-[#FFC247] to-[#FF7043] hover:from-[#FFC247] hover:to-[#FF7043] text-[#101827] font-black text-lg sm:text-xl uppercase tracking-wider shadow-[0_10px_30px_rgba(255,112,67,0.45)] border border-[#FFC247]/70 flex items-center justify-center space-x-3 transition-transform active:scale-95 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>START</span>
          </button>

          <button
            onClick={() => setShowMultiplayerModal(true)}
            className="px-8 py-4 rounded-2xl bg-[#101827]/90 hover:bg-slate-900 text-[#F8FAFC] font-black text-lg sm:text-xl uppercase tracking-wider border-2 border-cyan-400/70 hover:border-cyan-300 shadow-[0_10px_25px_rgba(6,182,212,0.22)] flex items-center justify-center space-x-3 transition-transform active:scale-95 cursor-pointer"
          >
            <Users className="w-6 h-6 text-cyan-400" />
            <span>MULTIPLAYER</span>
          </button>
        </div>
      </div>

      {/* Multiplayer Action Modal (Create Room or Join with Code) */}
      {showMultiplayerModal && (
        <div className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-slate-950/85">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-left">
            <button
              onClick={() => setShowMultiplayerModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close Multiplayer Menu"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-black uppercase tracking-wider text-white">
                TypeIgnite Multiplayer
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Race live against up to 4 friends in a private TypeIgnite 3D speedway room.
            </p>

            {/* Option 1: Create Private Room */}
            <button
              onClick={() => {
                setShowMultiplayerModal(false);
                onCreateMultiplayer();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-colors cursor-pointer mb-5"
            >
              <Users className="w-4 h-4" />
              <span>Create Private Room</span>
            </button>

            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-500 uppercase">
                OR JOIN WITH ROOM CODE
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Option 2: Join Room by Code */}
            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ENTER 6-DIGIT CODE"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono-racing text-center text-xl tracking-widest uppercase focus:outline-none focus:border-amber-400"
                autoFocus
              />
              <button
                type="submit"
                disabled={!joinCodeInput.trim()}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Join Race Grid</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
