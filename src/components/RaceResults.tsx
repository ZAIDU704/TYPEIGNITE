import React from 'react';
import { Racer, TypingStats, Achievement } from '../types/game';
import { Trophy, RotateCcw, Home, Award, Zap, Target, AlertCircle, Film, Sparkles } from 'lucide-react';

interface RaceResultsProps {
  playerRacer: Racer;
  allRacers: Racer[];
  stats: TypingStats;
  isPersonalBest: boolean;
  newlyUnlockedAchievements?: Achievement[];
  onRaceAgain: () => void;
  onReturnHome: () => void;
  onWatchReplay?: () => void;
}

export const RaceResults: React.FC<RaceResultsProps> = ({
  playerRacer,
  allRacers,
  stats,
  isPersonalBest,
  newlyUnlockedAchievements = [],
  onRaceAgain,
  onReturnHome,
  onWatchReplay,
}) => {
  const sortedRacers = [...allRacers].sort((a, b) => a.rank - b.rank);
  const rank = playerRacer.rank;

  const getRankBadge = (pos: number) => {
    if (pos === 1) return { title: '1ST PLACE CHAMPION', icon: '🏆', bg: 'bg-amber-500/20 border-amber-500/50 text-amber-300' };
    if (pos === 2) return { title: '2ND PLACE RUNNER-UP', icon: '🥈', bg: 'bg-slate-400/20 border-slate-400/50 text-slate-200' };
    if (pos === 3) return { title: '3RD PLACE PODIUM', icon: '🥉', bg: 'bg-amber-700/20 border-amber-600/50 text-amber-200' };
    return { title: '4TH PLACE FINISHER', icon: '🏁', bg: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' };
  };

  const badge = getRankBadge(rank);

  const getMotivationalMessage = () => {
    if (rank === 1) {
      return "Phenomenal driving! You dominated the speedway with relentless focus and blistering speed.";
    }
    if (rank === 2) {
      return "So close to the gold! An exceptional drive, just a few keystrokes away from taking the crown.";
    }
    if (rank === 3) {
      return "Podium finish! Solid determination and rhythm throughout all 120 seconds of intense racing.";
    }
    return "Great effort on the asphalt! Every race sharpens your finger memory. Dust yourself off and run it back!";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center animate-in zoom-in-95 duration-300 my-8">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Rank Header */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border mb-4 font-bold text-xs uppercase tracking-wider shadow-sm">
          <span>{badge.icon}</span>
          <span>{badge.title}</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
          TypeIgnite Race Finished!
        </h2>

        <p className="text-slate-300 text-sm max-w-lg mx-auto mb-5">
          {getMotivationalMessage()}
        </p>

        {isPersonalBest && (
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-amber-300 text-xs font-bold mb-4 animate-pulse">
            <Award className="w-4 h-4" />
            <span>NEW PERSONAL BEST NET WPM!</span>
          </div>
        )}

        {/* Newly Unlocked Trophies Banner */}
        {newlyUnlockedAchievements.length > 0 && (
          <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-amber-500/15 border border-amber-500/40 flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center space-x-1 text-xs font-bold text-amber-300 uppercase tracking-wider mr-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>New Achievements:</span>
            </div>
            {newlyUnlockedAchievements.map((ach) => (
              <span
                key={ach.id}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-amber-400/50 text-white text-xs font-semibold"
              >
                <span>{ach.icon}</span>
                <span>{ach.title}</span>
              </span>
            ))}
          </div>
        )}

        {/* 4 Racers Final Standings Stand */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 mb-6">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3 text-left">
            Final Standings
          </h3>
          <div className="space-y-2">
            {sortedRacers.map((racer) => (
              <div
                key={racer.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-sm font-medium transition-all ${
                  racer.isSelf
                    ? 'bg-amber-500/10 border-amber-500/40 text-white font-bold ring-1 ring-amber-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 text-center font-mono-racing font-bold text-slate-400">
                    #{racer.rank}
                  </span>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: racer.color }} />
                  <span>
                    {racer.name} {racer.isSelf && '(You)'}
                  </span>
                </div>
                <div className="flex items-center space-x-4 font-mono-racing text-xs">
                  <span className="text-amber-400 font-bold">{racer.wpm} WPM</span>
                  <span className="text-slate-400">{Math.round(racer.progress)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Performance Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-slate-950/90 border border-slate-800/80 p-3.5 rounded-2xl flex flex-col items-center">
            <Zap className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Net Speed</span>
            <span className="text-2xl font-black font-mono-racing text-white mt-0.5">
              {stats.netWpm} <span className="text-xs font-normal text-slate-400">WPM</span>
            </span>
            <span className="text-[10px] text-slate-400 mt-1">Gross: {stats.grossWpm} WPM</span>
          </div>

          <div className="bg-slate-950/90 border border-slate-800/80 p-3.5 rounded-2xl flex flex-col items-center">
            <Target className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Accuracy</span>
            <span className="text-2xl font-black font-mono-racing text-emerald-400 mt-0.5">
              {stats.accuracy}%
            </span>
            <span className="text-[10px] text-slate-400 mt-1">{stats.correctChars} correct chars</span>
          </div>

          <div className="bg-slate-950/90 border border-slate-800/80 p-3.5 rounded-2xl flex flex-col items-center">
            <AlertCircle className="w-4 h-4 text-rose-400 mb-1" />
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Mistakes</span>
            <span className="text-2xl font-black font-mono-racing text-rose-400 mt-0.5">
              {stats.incorrectChars}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">{stats.backspaces} backspaces</span>
          </div>

          <div className="bg-slate-950/90 border border-slate-800/80 p-3.5 rounded-2xl flex flex-col items-center">
            <Trophy className="w-4 h-4 text-purple-400 mb-1" />
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Completed</span>
            <span className="text-2xl font-black font-mono-racing text-purple-300 mt-0.5">
              {stats.completedSentences}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">{stats.completedWords} total words</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onRaceAgain}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-orange-950/30 flex items-center justify-center space-x-2 transition-transform active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Race Again</span>
          </button>

          {onWatchReplay && (
            <button
              onClick={onWatchReplay}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-sm shadow-md shadow-cyan-950/30 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <Film className="w-4 h-4 fill-current" />
              <span>Watch 3D Replay</span>
            </button>
          )}

          <button
            onClick={onReturnHome}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
