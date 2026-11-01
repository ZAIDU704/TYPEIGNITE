import React, { useState } from 'react';
import {
  AIDifficulty,
  UserPreferences,
  VoiceLanguage,
  CursorStyle,
  ColorBlindMode,
  TypingFontSize,
} from '../types/game';
import { rivalVoice } from '../utils/rivalVoice';
import {
  X,
  Volume2,
  VolumeX,
  Mic,
  Trash2,
  User,
  Eye,
  Trophy,
  Film,
  Sparkles,
  Type,
  Sun,
  Flame,
  Gauge,
} from 'lucide-react';

interface SettingsModalProps {
  preferences: UserPreferences;
  aiDifficulty?: AIDifficulty;
  onChangeDifficulty?: (diff: AIDifficulty) => void;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onResetData: () => void;
  onOpenAchievements: () => void;
  onOpenReplays: () => void;
  onClose: () => void;
}

const BEGINNER_WPM_PRESETS = [15, 20, 25, 30, 40];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  preferences,
  aiDifficulty = 'beginner',
  onChangeDifficulty,
  onUpdatePreferences,
  onResetData,
  onOpenAchievements,
  onOpenReplays,
  onClose,
}) => {
  const [usernameInput, setUsernameInput] = useState(preferences.username);
  const [testSuccess, setTestSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const beginnerTargetWpm = preferences.beginnerTargetWpm ?? 25;

  const cues = preferences.visualCues || {
    cursorStyle: 'pulsing_cyan',
    colorBlindMode: 'off',
    keyGhostFeedback: true,
    speedometerGlow: true,
    fontSize: 'normal',
  };

  const updateVisualCues = (patch: Partial<typeof cues>) => {
    onUpdatePreferences({
      visualCues: {
        ...cues,
        ...patch,
      },
    });
  };

  const handleSaveUsername = () => {
    const trimmed = usernameInput.trim();
    if (trimmed) {
      onUpdatePreferences({ username: trimmed });
    }
  };

  const handleLanguageChange = (lang: VoiceLanguage) => {
    onUpdatePreferences({ voiceLanguage: lang });
  };

  const handleTestVoice = () => {
    rivalVoice.trigger('test_voice', preferences.voiceLanguage, preferences.voiceMuted, true);
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 2500);
  };

  const handleReset = () => {
    onResetData();
    setConfirmReset(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-left animate-in zoom-in-95 duration-200 my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close Settings"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-extrabold text-white mb-6 flex items-center space-x-2">
          <span>TypeIgnite Settings & Accessibility</span>
        </h2>

        <div className="space-y-6">
          {/* Quick Access Badges for Trophy Room and Replay Vault */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                onClose();
                onOpenAchievements();
              }}
              className="p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center space-x-2.5 transition-colors cursor-pointer text-left"
            >
              <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Trophy Room</span>
                <span className="text-[10px] text-amber-300">View Achievements</span>
              </div>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenReplays();
              }}
              className="p-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 flex items-center space-x-2.5 transition-colors cursor-pointer text-left"
            >
              <Film className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Race Replays</span>
                <span className="text-[10px] text-cyan-300">3D Race Vault</span>
              </div>
            </button>
          </div>

          {/* AI Rival Difficulty Selector */}
          {onChangeDifficulty && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Rival Difficulty (Single-Player)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'beginner', label: 'Beginner', speed: `${beginnerTargetWpm} WPM` },
                  { id: 'rookie', label: 'Rookie', speed: '~35 WPM' },
                  { id: 'pro', label: 'Pro', speed: '~62 WPM' },
                  { id: 'master', label: 'Master', speed: '~88 WPM' },
                ].map((diff) => (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => onChangeDifficulty(diff.id as AIDifficulty)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      aiDifficulty === diff.id
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs uppercase">{diff.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono-racing mt-0.5">{diff.speed}</div>
                  </button>
                ))}
              </div>

              {/* Beginner Custom Target WPM Section */}
              {aiDifficulty === 'beginner' && (
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="settings-beginner-wpm"
                      className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5"
                    >
                      <Gauge className="w-3.5 h-3.5" />
                      <span>Beginner Target Speed (WPM)</span>
                    </label>
                    <input
                      id="settings-beginner-wpm"
                      type="number"
                      min={5}
                      max={120}
                      aria-label="Beginner Target Speed WPM"
                      value={beginnerTargetWpm}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!Number.isNaN(val)) {
                          onUpdatePreferences({
                            beginnerTargetWpm: Math.max(5, Math.min(120, val)),
                          });
                        }
                      }}
                      className="w-20 px-2.5 py-1 rounded-xl bg-slate-900 border border-emerald-500/50 text-emerald-300 font-mono-racing font-bold text-xs text-center focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] text-slate-400">Quick Select:</span>
                    <div className="flex items-center gap-1.5">
                      {BEGINNER_WPM_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => onUpdatePreferences({ beginnerTargetWpm: preset })}
                          className={`px-2.5 py-1 rounded-lg font-mono-racing text-[11px] font-bold transition-colors cursor-pointer ${
                            beginnerTargetWpm === preset
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {preset} WPM
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Username Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Guest Racer Name</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                maxLength={18}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm"
                placeholder="Enter racer name"
              />
              <button
                onClick={handleSaveUsername}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>

          {/* Optional Visual Typing Cues & Accessibility */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Eye className="w-4 h-4" />
              <span>Visual Typing Cues & Accessibility</span>
            </div>

            {/* Cursor Style */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400">
                Cursor Cue Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                {[
                  { id: 'pulsing_cyan', label: 'Pulsing Cyan' },
                  { id: 'high_contrast_underline', label: 'High Contrast' },
                  { id: 'block', label: 'Solid Block' },
                  { id: 'off', label: 'Off' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateVisualCues({ cursorStyle: c.id as CursorStyle })}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                      cues.cursorStyle === c.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[11px]">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Accessibility */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
                <Type className="w-3.5 h-3.5" />
                <span>Typing Text Size (Low Vision Accessible)</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: 'normal', label: 'Standard (18px)' },
                  { id: 'large', label: 'Large (22px)' },
                  { id: 'extra_large', label: 'XL (26px)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => updateVisualCues({ fontSize: f.id as TypingFontSize })}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                      cues.fontSize === f.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[11px]">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accessible Toggles: Color-blind & Speedometer */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                onClick={() =>
                  updateVisualCues({
                    colorBlindMode: cues.colorBlindMode === 'off' ? 'high_contrast' : 'off',
                  })
                }
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  cues.colorBlindMode === 'high_contrast'
                    ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Sun className="w-3.5 h-3.5 text-sky-400" />
                  <span>Color-Blind Mode</span>
                </div>
                <span className="font-bold text-[10px]">
                  {cues.colorBlindMode === 'high_contrast' ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={() =>
                  updateVisualCues({
                    speedometerGlow: !cues.speedometerGlow,
                  })
                }
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  cues.speedometerGlow
                    ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Speedometer Glow</span>
                </div>
                <span className="font-bold text-[10px]">
                  {cues.speedometerGlow ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          {/* RIVAL VOICE™ Language Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                <span>RIVAL VOICE™ Language</span>
              </label>
              <button
                onClick={() => onUpdatePreferences({ voiceMuted: !preferences.voiceMuted })}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
              >
                {preferences.voiceMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-400">Announcer Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Voice Enabled</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'english', label: 'English', sub: 'Default' },
                { id: 'urdu', label: 'اردو', sub: 'Urdu Script' },
                { id: 'roman_urdu', label: 'Roman Urdu', sub: 'Conversational' },
              ].map((lang) => {
                const isSelected = preferences.voiceLanguage === lang.id;
                return (
                  <button
                    key={lang.id}
                    onClick={() => handleLanguageChange(lang.id as VoiceLanguage)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm">{lang.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{lang.sub}</div>
                  </button>
                );
              })}
            </div>

            {/* Test Voice Button */}
            <div className="pt-1">
              <button
                onClick={handleTestVoice}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                <span>{testSuccess ? 'Speaking Sample...' : 'Test Announcer Voice'}</span>
              </button>
            </div>
          </div>

          {/* Personal Records Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-2">
              Your Speed Records
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/60 p-2 rounded-xl">
                <div className="text-[10px] text-slate-400">BEST WPM</div>
                <div className="font-mono-racing font-bold text-base text-amber-400">
                  {preferences.bestWpm}
                </div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl">
                <div className="text-[10px] text-slate-400">BEST ACCURACY</div>
                <div className="font-mono-racing font-bold text-base text-emerald-400">
                  {preferences.bestAccuracy}%
                </div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl">
                <div className="text-[10px] text-slate-400">RACES RUN</div>
                <div className="font-mono-racing font-bold text-base text-purple-400">
                  {preferences.totalRaces}
                </div>
              </div>
            </div>
          </div>

          {/* Reset Local Data */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Local Game Data</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-rose-300">Are you sure?</span>
                <button
                  onClick={handleReset}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold cursor-pointer"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
            <span className="text-[11px] text-slate-500">Audio: Voice Announcements Only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
