import React from 'react';
import { Achievement } from '../types/game';
import { Award, X } from 'lucide-react';

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onDismiss,
}) => {
  if (!achievement) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-400 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start space-x-3">
        <div className="text-3xl p-2 rounded-xl bg-amber-500/20 border border-amber-400/40 shrink-0">
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            <span>ACHIEVEMENT UNLOCKED!</span>
          </div>
          <h4 className="text-sm font-black text-white mt-0.5 truncate">
            {achievement.title}
          </h4>
          <p className="text-[11px] text-slate-300 mt-0.5">
            {achievement.description}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
          aria-label="Dismiss achievement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
