import React, { useRef, useEffect, useState } from 'react';
import { TypingStats, VisualCuesConfig } from '../types/game';

interface TypingAreaProps {
  currentSentence: string;
  userInput: string;
  onCharacterKey: (char: string) => void;
  onBackspace: () => void;
  errorFlashSeq?: number;
  lastRejectedChar?: string | null;
  stats: TypingStats;
  remainingTime: number; // in seconds
  isActive: boolean;
  leadGapText: string;
  visualCues?: VisualCuesConfig;
  onFinish?: () => void;
}

export const TypingArea: React.FC<TypingAreaProps> = ({
  currentSentence,
  userInput,
  onCharacterKey,
  onBackspace,
  errorFlashSeq = 0,
  lastRejectedChar = null,
  stats,
  remainingTime,
  isActive,
  leadGapText,
  visualCues,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ghostKey, setGhostKey] = useState<string | null>(null);
  const [isErrorFlashing, setIsErrorFlashing] = useState(false);

  const cues: VisualCuesConfig = visualCues || {
    cursorStyle: 'pulsing_cyan',
    colorBlindMode: 'off',
    keyGhostFeedback: true,
    speedometerGlow: true,
    fontSize: 'normal',
  };

  // Trigger brief red visual feedback whenever an incorrect character is rejected
  useEffect(() => {
    if (errorFlashSeq > 0) {
      setIsErrorFlashing(true);
      const timer = window.setTimeout(() => {
        setIsErrorFlashing(false);
      }, 260);
      return () => window.clearTimeout(timer);
    }
  }, [errorFlashSeq]);

  // Keep input focused during active race
  useEffect(() => {
    if (isActive) {
      inputRef.current?.focus();
    }
  }, [isActive]);

  // Global keydown listener fallback so typing works immediately even if the user clicked outside the input
  useEffect(() => {
    if (!isActive) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        onBackspace();
        inputRef.current?.focus();
        if (cues.keyGhostFeedback) {
          setGhostKey('⌫');
          window.setTimeout(() => setGhostKey(null), 220);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onCharacterKey(e.key);
        inputRef.current?.focus();
        if (cues.keyGhostFeedback) {
          setGhostKey(e.key === ' ' ? '␣' : e.key);
          window.setTimeout(() => setGhostKey(null), 250);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isActive, onCharacterKey, onBackspace, cues.keyGhostFeedback]);

  const handleContainerClick = () => {
    if (isActive) {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isActive) return;

    // Prevent clipboard paste shortcuts (Ctrl+V / Cmd+V)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      onBackspace();
      if (cues.keyGhostFeedback) {
        setGhostKey('⌫');
        window.setTimeout(() => setGhostKey(null), 220);
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      onCharacterKey(e.key);
      if (cues.keyGhostFeedback) {
        setGhostKey(e.key === ' ' ? '␣' : e.key);
        window.setTimeout(() => setGhostKey(null), 250);
      }
    }
  };

  // Fallback for mobile virtual keyboards / IME that emit input changes without standard keydown
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isActive) return;
    const val = e.target.value;

    // Block multi-character paste attempts
    if (Math.abs(val.length - userInput.length) > 1) {
      return;
    }

    if (val.length === userInput.length - 1 && userInput.startsWith(val)) {
      onBackspace();
      if (cues.keyGhostFeedback) {
        setGhostKey('⌫');
        window.setTimeout(() => setGhostKey(null), 220);
      }
      return;
    }

    if (val.length === userInput.length + 1 && val.startsWith(userInput)) {
      const addedChar = val[val.length - 1];
      onCharacterKey(addedChar);
      if (cues.keyGhostFeedback) {
        setGhostKey(addedChar === ' ' ? '␣' : addedChar);
        window.setTimeout(() => setGhostKey(null), 250);
      }
    }
  };

  // Format countdown mm:ss
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Font size class mapping for the horizontal strip
  const fontSizeClass =
    cues.fontSize === 'extra_large'
      ? 'text-xl sm:text-2xl'
      : cues.fontSize === 'large'
      ? 'text-lg sm:text-xl'
      : 'text-base sm:text-xl';

  // Speedometer glow styling
  const getSpeedGlowClass = () => {
    if (isErrorFlashing) {
      return 'border-rose-500/90 shadow-[0_0_20px_rgba(244,63,94,0.35)]';
    }
    if (!cues.speedometerGlow) return 'border-slate-800';
    if (stats.netWpm >= 85) return 'border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.35)]';
    if (stats.netWpm >= 55) return 'border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.3)]';
    if (stats.netWpm >= 25) return 'border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.25)]';
    return 'border-cyan-500/40 shadow-cyan-950/20';
  };

  // Render character-by-character along the single-line horizontal strip
  const renderCharacters = () => {
    const chars = currentSentence.split('');
    const cursorIndex = userInput.length;

    return chars.map((char, index) => {
      const displayChar = char === ' ' ? '\u00A0' : char;

      if (index < cursorIndex) {
        // Strictly verified correct character
        if (cues.colorBlindMode === 'high_contrast') {
          return (
            <span
              key={index}
              data-char-status="correct"
              className="inline-block w-[1ch] text-center text-sky-300 font-bold underline decoration-sky-400 decoration-2"
            >
              {displayChar}
            </span>
          );
        }
        return (
          <span
            key={index}
            data-char-status="correct"
            className="inline-block w-[1ch] text-center text-emerald-400 font-semibold"
          >
            {displayChar}
          </span>
        );
      }

      if (index === cursorIndex) {
        // Current expected character: flashes red briefly on rejected keypress without moving cursor
        if (isErrorFlashing) {
          const errClass =
            cues.colorBlindMode === 'high_contrast'
              ? 'inline-block w-[1ch] text-center text-white bg-amber-600 border-b-2 border-white font-black'
              : 'inline-block w-[1ch] text-center text-white bg-rose-600 border-b-2 border-rose-200 font-black';
          return (
            <span key={index} data-char-status="current-error" className={errClass}>
              {char === ' ' ? '␣' : displayChar}
            </span>
          );
        }

        let cursorClass =
          'inline-block w-[1ch] text-center text-cyan-200 bg-cyan-500/25 border-b-2 border-cyan-400 font-bold';
        if (cues.cursorStyle === 'high_contrast_underline') {
          cursorClass =
            'inline-block w-[1ch] text-center text-amber-200 bg-amber-950/80 border-b-4 border-amber-400 font-black';
        } else if (cues.cursorStyle === 'block') {
          cursorClass =
            'inline-block w-[1ch] text-center text-slate-950 bg-amber-400 font-black';
        } else if (cues.cursorStyle === 'off') {
          cursorClass = 'inline-block w-[1ch] text-center text-white font-semibold underline';
        }

        return (
          <span key={index} data-char-status="current" className={cursorClass}>
            {char === ' ' ? '␣' : displayChar}
          </span>
        );
      }

      // Upcoming characters
      return (
        <span
          key={index}
          data-char-status="upcoming"
          className="inline-block w-[1ch] text-center text-slate-200"
        >
          {displayChar}
        </span>
      );
    });
  };

  const cursorOffsetCh = userInput.length;

  return (
    <div
      onClick={handleContainerClick}
      className={`relative w-full rounded-xl bg-slate-900/95 border transition-colors duration-150 px-3.5 py-2.5 sm:px-5 sm:py-3 shadow-xl ${
        isActive ? getSpeedGlowClass() : 'border-slate-800 opacity-85'
      }`}
    >
      {/* Hidden high-accessibility input to receive keyboard and mobile IME input */}
      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        disabled={!isActive}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-testid="strict-typing-input"
        className="absolute opacity-0 pointer-events-auto w-full h-full left-0 top-0 cursor-text"
        aria-label="Type the exact characters shown to accelerate your car"
      />

      {/* Compact Top Race Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/90 text-xs sm:text-sm">
        {/* 120s Countdown Timer */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            TIME
          </span>
          <span
            className={`font-mono-racing font-extrabold text-lg sm:text-xl px-2.5 py-0.5 rounded-md border ${
              remainingTime <= 15
                ? 'bg-rose-950/70 text-rose-400 border-rose-500/60 animate-pulse'
                : 'bg-slate-800/80 text-white border-slate-700'
            }`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {timeFormatted}
          </span>
        </div>

        {/* Live Metrics: WPM, Accuracy, Errors */}
        <div
          className="flex items-center space-x-4 sm:space-x-6 font-mono-racing"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          <div className="flex items-baseline space-x-1.5">
            <span className="text-[11px] text-slate-400 uppercase">WPM</span>
            <span data-testid="stat-wpm" className="text-base sm:text-lg font-bold text-amber-400">
              {stats.netWpm}
            </span>
          </div>

          <div className="flex items-baseline space-x-1.5">
            <span className="text-[11px] text-slate-400 uppercase">ACC</span>
            <span
              data-testid="stat-accuracy"
              className="text-base sm:text-lg font-bold text-emerald-400"
            >
              {stats.accuracy}%
            </span>
          </div>

          <div className="flex items-baseline space-x-1.5">
            <span className="text-[11px] text-slate-400 uppercase">ERRORS</span>
            <span
              data-testid="stat-errors"
              className="text-base sm:text-lg font-bold text-rose-400"
            >
              {stats.incorrectChars}
            </span>
          </div>
        </div>

        {/* Relative Position Gap & Progress */}
        <div className="hidden sm:flex items-center space-x-2 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800 text-xs">
          <span className="text-slate-400">POS:</span>
          <span className="font-semibold text-cyan-300 font-mono-racing">{leadGapText}</span>
        </div>
      </div>

      {/* Compact Single-Line Smoothly Scrolling Horizontal Typing Strip */}
      <div
        data-testid="typing-strip"
        data-cursor-index={cursorOffsetCh}
        data-error-active={isErrorFlashing ? 'true' : 'false'}
        className={`relative h-12 sm:h-13 flex items-center bg-slate-950/90 rounded-lg px-3 border transition-colors duration-150 cursor-text overflow-hidden ${
          isErrorFlashing ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800/90'
        }`}
      >
        {/* Left & Right edge subtle fade masks so scrolling characters enter/exit cleanly */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent z-10 flex items-center pl-2.5">
          <span className="text-[10px] font-mono-racing uppercase tracking-wider text-cyan-400/80 font-bold">
            ▸
          </span>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-slate-950 to-transparent z-10" />

        {/* Rejected key warning badge or ghost keypress indicator */}
        {isErrorFlashing && lastRejectedChar ? (
          <div
            data-testid="typing-error-feedback"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none px-2 py-0.5 rounded bg-rose-600/90 text-white text-[11px] font-mono-racing font-bold shadow"
          >
            ✗ {lastRejectedChar === ' ' ? 'Space' : lastRejectedChar}
          </div>
        ) : (
          ghostKey && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono-racing font-bold">
              {ghostKey}
            </div>
          )
        )}

        {/* Focal Anchor + Smoothly Translating Character Strip */}
        <div className="w-full overflow-hidden pl-10 sm:pl-20">
          <div
            data-testid="typing-strip-track"
            className={`font-mono-racing ${fontSizeClass} whitespace-nowrap select-none transition-transform duration-150 ease-out will-change-transform`}
            style={{
              transform: `translate3d(-${cursorOffsetCh}ch, 0, 0)`,
            }}
          >
            {renderCharacters()}
          </div>
        </div>
      </div>

      {/* Compact Footer Status Line */}
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate">
          Strict Tutor Mode: Type exact characters to advance ({userInput.length}/
          {currentSentence.length})
        </span>
        <span className="font-mono-racing shrink-0 ml-2">
          Passages: {stats.completedSentences} • Words: {stats.completedWords}
        </span>
      </div>
    </div>
  );
};
