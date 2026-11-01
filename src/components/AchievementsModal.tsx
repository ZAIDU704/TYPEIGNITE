import React, { useState } from 'react';
import { Achievement } from '../types/game';
import { X, Trophy, Award, Lock, CheckCircle2, Sparkles, Filter } from 'lucide-react';

interface AchievementsModalProps {
  achievements: Achievement[];
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  achievements,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  const categories = [
    { id: 'all', label: 'All Badges' },
    { id: 'racing', label: 'Racing' },
    { id: 'speed', label: 'Speed' },
    { id: 'accuracy', label: 'Accuracy' },
    { id: 'endurance', label: 'Endurance' },
    { id: 'special', label: 'Special' },
  ];

  const filteredAchievements = achievements.filter((a) => {
    if (selectedCategory === 'all') return true;
    return a.category === selectedCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-left animate-in zoom-in-95 duration-200 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close Achievements"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">TypeIgnite Trophy Room</h2>
            <p className="text-xs text-slate-400">
              Unlock prestigious trophies through speed, precision, and fearless racing.
            </p>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 mb-6">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Trophies Unlocked</span>
            </span>
            <span className="font-mono-racing text-amber-400 font-bold">
              {unlockedCount} / {totalCount} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
          {filteredAchievements.map((ach) => {
            return (
              <div
                key={ach.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  ach.unlocked
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800/70 opacity-60'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`text-2xl p-2 rounded-xl shrink-0 ${
                      ach.unlocked
                        ? 'bg-amber-500/20 border border-amber-500/30'
                        : 'bg-slate-800/50 grayscale'
                    }`}
                  >
                    {ach.unlocked ? ach.icon : '🔒'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white truncate">
                        {ach.title}
                      </span>
                      {ach.unlocked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {ach.description}
                    </p>

                    {ach.maxProgress && !ach.unlocked && (
                      <div className="mt-2 text-[10px] text-slate-500 font-mono-racing">
                        Progress: {ach.progress || 0} / {ach.maxProgress}
                      </div>
                    )}

                    {ach.unlocked && ach.unlockedAt && (
                      <div className="mt-1.5 text-[10px] text-amber-400/80 font-mono-racing">
                        Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            All achievements are saved locally in your browser. No account required.
          </p>
        </div>
      </div>
    </div>
  );
};
