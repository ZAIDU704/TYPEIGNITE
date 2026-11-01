import React, { useState, useEffect, useRef } from 'react';
import { RaceReplayData } from '../types/game';
import { interpolateReplayAtTime } from '../utils/replayEngine';
import { Track3D } from './Track3D';
import { Play, Pause, RotateCcw, FastForward, ArrowLeft, Volume2 } from 'lucide-react';

interface ReplayPlayerProps {
  replay: RaceReplayData;
  onExit: () => void;
}

export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({ replay, onExit }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const lastTickTime = useRef(performance.now());

  const duration = replay.durationSeconds || 120;

  // Playback loop
  useEffect(() => {
    let animFrame: number;

    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTickTime.current) / 1000;
      lastTickTime.current = now;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + dt * playbackSpeed;
          if (next >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return next;
        });
      }

      animFrame = requestAnimationFrame(tick);
    };

    lastTickTime.current = performance.now();
    animFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, playbackSpeed, duration]);

  // Interpolate state at current scrubber time
  const interpolated = interpolateReplayAtTime(replay, currentTime);

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
  };

  const minutes = Math.floor(currentTime / 60);
  const seconds = Math.floor(currentTime % 60);
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalMin = Math.floor(duration / 60);
  const totalSec = Math.floor(duration % 60);
  const totalFormatted = `${String(totalMin).padStart(2, '0')}:${String(totalSec).padStart(2, '0')}`;

  const playerRacer = interpolated.racers.find((r) => r.isSelf) || interpolated.racers[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-5 max-w-7xl mx-auto w-full">
      {/* Top Controls Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <button
          onClick={onExit}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Replay</span>
        </button>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FFC247]">
            TYPEIGNITE REPLAY • {replay.finalStats.netWpm} NET WPM • {replay.finalStats.accuracy}% ACCURACY
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono-racing text-slate-400">
            Finish: #{replay.playerRank}
          </span>
        </div>
      </div>

      {/* 3D Speedway Playback Viewport */}
      <div className="w-full h-[260px] sm:h-[360px] md:h-[420px] my-3 relative">
        <Track3D racers={interpolated.racers} playerLane={playerRacer?.lane ?? 0} isReplay={true} />
      </div>

      {/* Synchronized Live Announcement Banner */}
      {interpolated.announcementText && (
        <div className="mb-3 p-3 bg-amber-950/70 border border-amber-500/40 rounded-xl flex items-center space-x-3 animate-in fade-in">
          <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-amber-300">RIVAL VOICE™ (Replay):</span>
          <p className="text-xs text-amber-100 italic">
            &ldquo;{interpolated.announcementText}&rdquo;
          </p>
        </div>
      )}

      {/* Synchronized Typing Stream Display */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 mb-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono-racing">
          <span>TYPED SENTENCE AT {timeFormatted}</span>
          <span>Cars Speed: {playerRacer?.wpm || 0} WPM</span>
        </div>
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 font-mono-racing text-base">
          <span className="text-emerald-400 font-semibold">{interpolated.userInput}</span>
          <span className="text-slate-500">
            {interpolated.currentSentence.slice(interpolated.userInput.length)}
          </span>
        </div>
      </div>

      {/* Replay Scrubbing & Timeline Controls Dock */}
      <div className="p-4 rounded-2xl bg-slate-900/95 border border-slate-800 flex flex-col gap-3 shadow-2xl">
        {/* Timeline Slider */}
        <div className="flex items-center space-x-4">
          <span className="font-mono-racing text-xs font-bold text-amber-400 w-12 text-right">
            {timeFormatted}
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Replay timeline scrubber"
            className="flex-1 accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="font-mono-racing text-xs font-semibold text-slate-400 w-12">
            {totalFormatted}
          </span>
        </div>

        {/* Play / Pause / Speed Controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer"
              aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              onClick={handleRestart}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Restart from beginning"
              aria-label="Restart replay"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Multipliers */}
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[0.5, 1, 1.5, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-racing font-bold transition-colors cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
