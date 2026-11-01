import React from 'react';
import { RaceReplayData } from '../types/game';
import { X, Film, Play, Trophy, Calendar, Zap, Target } from 'lucide-react';

interface ReplaysListModalProps {
  replays: RaceReplayData[];
  onSelectReplay: (replay: RaceReplayData) => void;
  onClose: () => void;
}

export const ReplaysListModal: React.FC<ReplaysListModalProps> = ({
  replays,
  onSelectReplay,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-left animate-in zoom-in-95 duration-200 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close Replays"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">TypeIgnite 3D Replay Vault</h2>
            <p className="text-xs text-slate-400">
              Rewatch past TypeIgnite speedway races with exact car positions, typing feedback, and RIVAL VOICE commentary.
            </p>
          </div>
        </div>

        {replays.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80">
            <Film className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">No race replays recorded yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Complete a race and your replay will automatically be captured right here!
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {replays.map((rep) => {
              const rankEmoji = rep.playerRank === 1 ? '🥇' : rep.playerRank === 2 ? '🥈' : rep.playerRank === 3 ? '🥉' : '🏁';
              return (
                <div
                  key={rep.id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{rankEmoji}</span>
                      <span className="font-bold text-sm text-white">
                        {rep.mode === 'single' ? `Single Player (${rep.difficulty?.toUpperCase()})` : 'Multiplayer Race'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono-racing">
                        {new Date(rep.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 mt-2 text-xs font-mono-racing text-slate-400">
                      <span className="flex items-center space-x-1 text-amber-400 font-bold">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{rep.finalStats.netWpm} WPM</span>
                      </span>

                      <span className="flex items-center space-x-1 text-emerald-400 font-bold">
                        <Target className="w-3.5 h-3.5" />
                        <span>{rep.finalStats.accuracy}%</span>
                      </span>

                      <span className="text-slate-400">
                        {rep.finalStats.completedWords} words
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onSelectReplay(rep);
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch Replay</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Replays are stored in your local browser storage. No server storage.
          </p>
        </div>
      </div>
    </div>
  );
};
