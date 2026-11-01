import React from 'react';
import { RivalAnnouncement } from '../types/game';
import { Volume2, Mic } from 'lucide-react';

interface RivalVoiceCaptionProps {
  announcement: RivalAnnouncement | null;
  muted: boolean;
  onToggleMute: () => void;
}

export const RivalVoiceCaption: React.FC<RivalVoiceCaptionProps> = ({
  announcement,
  muted,
  onToggleMute,
}) => {
  if (!announcement) {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-300">RIVAL VOICE™</span>
          <span>Listening to race action...</span>
        </div>
        <button
          onClick={onToggleMute}
          className="text-slate-400 hover:text-amber-400 transition-colors p-1"
          aria-label={muted ? 'Unmute announcer voice' : 'Mute announcer voice'}
          title={muted ? 'Unmute' : 'Mute'}
        >
          <Volume2 className={`w-4 h-4 ${muted ? 'opacity-40 text-red-400' : 'text-emerald-400'}`} />
        </button>
      </div>
    );
  }

  const isUrdu = announcement.language === 'urdu';

  return (
    <div
      role="region"
      aria-live="polite"
      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-purple-950/80 border border-amber-500/40 rounded-xl shadow-lg transition-all animate-in fade-in duration-300"
    >
      <div className="flex items-start sm:items-center space-x-3 mb-2 sm:mb-0">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
          <Mic className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              RIVAL VOICE™
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono-racing">
              {announcement.language === 'urdu' ? 'اردو' : announcement.language === 'roman_urdu' ? 'Roman Urdu' : 'English'}
            </span>
          </div>
          <p
            className={`mt-0.5 text-sm font-medium text-amber-100 ${
              isUrdu ? 'text-right font-sans text-base leading-relaxed' : ''
            }`}
            dir={isUrdu ? 'rtl' : 'ltr'}
          >
            &ldquo;{announcement.text}&rdquo;
          </p>
        </div>
      </div>

      <div className="flex items-center self-end sm:self-center space-x-3 pl-2">
        <div className="flex items-end space-x-0.5 h-4">
          <span className="w-1 bg-amber-400 rounded-full h-3 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 bg-amber-400 rounded-full h-4 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 bg-amber-400 rounded-full h-2 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <button
          onClick={onToggleMute}
          className="text-slate-400 hover:text-amber-300 transition-colors p-1 rounded"
          aria-label={muted ? 'Unmute voice' : 'Mute voice'}
        >
          <Volume2 className={`w-4 h-4 ${muted ? 'opacity-40 text-red-400' : 'text-amber-400'}`} />
        </button>
      </div>
    </div>
  );
};
