import React, { useState } from 'react';
import { MultiplayerRoomState } from '../types/game';
import { Copy, Check, Users, Play, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';

interface MultiplayerLobbyProps {
  roomState: MultiplayerRoomState;
  selfPlayerId: string;
  onToggleReady: () => void;
  onStartRace: () => void;
  onLeaveRoom: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  roomState,
  selfPlayerId,
  onToggleReady,
  onStartRace,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const players = Object.values(roomState.players);
  const selfPlayer = roomState.players[selfPlayerId];
  const isHost = selfPlayer?.isHost;

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}?room=${roomState.roomCode}`
    : `Room Code: ${roomState.roomCode}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomState.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const allReady = players.length >= 1 && players.every((p) => p.isReady || p.isHost);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <button
          onClick={onLeaveRoom}
          className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Lobby</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs uppercase font-bold text-[#FFC247] tracking-wider">
            TypeIgnite • Networked Race Room
          </span>
        </div>
      </div>

      {/* Room Code & Invitation Link Banner */}
      <div className="my-6 p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">
            Private Room Code
          </span>
          <div className="flex items-center space-x-3">
            <span className="font-mono-racing text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-widest">
              {roomState.roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Copy room code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        >
          <Users className="w-4 h-4 text-cyan-400" />
          <span>{copied ? 'Link Copied!' : 'Copy Invitation Link'}</span>
        </button>
      </div>

      {/* 4 Player Slots Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            RACERS ON THE GRID ({players.length} / 4)
          </span>
          <span className="text-xs text-slate-400 font-mono-racing">
            Exact 120s Race Duration
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((slotIndex) => {
            const player = players[slotIndex];
            if (player) {
              const isSelf = player.id === selfPlayerId;
              return (
                <div
                  key={player.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    isSelf
                      ? 'bg-slate-800/90 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: player.color }}
                    />
                    <div>
                      <div className="font-bold text-sm text-white flex items-center space-x-1.5">
                        <span>{player.name}</span>
                        {player.isHost && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                            HOST
                          </span>
                        )}
                        {isSelf && (
                          <span className="text-xs text-slate-400 font-normal">(You)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Lane {player.lane + 1}
                      </div>
                    </div>
                  </div>

                  <div>
                    {player.isHost ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Room Host</span>
                      </span>
                    ) : player.isReady ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Waiting</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            // Empty Slot
            return (
              <div
                key={slotIndex}
                className="p-4 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/30 flex items-center justify-center text-slate-500 text-xs"
              >
                <span>Lane {slotIndex + 1} • Waiting for racer...</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lobby Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <div>
          {!isHost && selfPlayer && (
            <button
              onClick={onToggleReady}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer ${
                selfPlayer.isReady
                  ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
              }`}
            >
              {selfPlayer.isReady ? 'Cancel Ready' : "I'm Ready to Race!"}
            </button>
          )}

          {isHost && (
            <p className="text-xs text-slate-400">
              You are the room host. Start the race once all racers are ready.
            </p>
          )}
        </div>

        {isHost && (
          <button
            onClick={onStartRace}
            disabled={!allReady}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              allReady
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-lg shadow-orange-950/40 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start 120s Race!</span>
          </button>
        )}
      </div>
    </div>
  );
};
