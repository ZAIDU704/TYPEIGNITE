import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PlayerSession {
  ws: WebSocket;
  id: string;
  name: string;
  roomCode: string;
  isHost: boolean;
  isReady: boolean;
  lane: number;
  color: string;
  progress: number;
  wpm: number;
  accuracy: number;
  rank: number;
}

interface Room {
  code: string;
  hostId: string;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  countdown: number;
  seed: number;
  players: Map<string, PlayerSession>;
  raceStartTime?: number;
  createdAt: number;
}

const CAR_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastToRoom(room: Room, message: any) {
  const data = JSON.stringify(message);
  for (const player of room.players.values()) {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}

function getRoomSnapshot(room: Room) {
  const playersObj: Record<string, any> = {};
  for (const [id, p] of room.players.entries()) {
    playersObj[id] = {
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isReady: p.isReady,
      lane: p.lane,
      color: p.color,
      progress: p.progress,
      wpm: p.wpm,
      accuracy: p.accuracy,
      rank: p.rank,
    };
  }

  return {
    roomCode: room.code,
    hostId: room.hostId,
    status: room.status,
    countdown: room.countdown,
    seed: room.seed,
    raceStartTime: room.raceStartTime,
    players: playersObj,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const { type } = data;

        if (type === 'create_room') {
          const { playerId, username } = data;
          let code = generateRoomCode();
          while (rooms.has(code)) {
            code = generateRoomCode();
          }

          const room: Room = {
            code,
            hostId: playerId,
            status: 'lobby',
            countdown: 3,
            seed: Math.floor(Math.random() * 100000),
            players: new Map(),
            createdAt: Date.now(),
          };

          const session: PlayerSession = {
            ws,
            id: playerId,
            name: username || 'Player 1',
            roomCode: code,
            isHost: true,
            isReady: true,
            lane: 0,
            color: CAR_COLORS[0],
            progress: 0,
            wpm: 0,
            accuracy: 100,
            rank: 1,
          };

          room.players.set(playerId, session);
          rooms.set(code, room);
          currentRoomCode = code;
          currentPlayerId = playerId;

          ws.send(JSON.stringify({
            type: 'room_joined',
            roomState: getRoomSnapshot(room),
            selfId: playerId,
          }));
        } 
        else if (type === 'join_room') {
          const { roomCode, playerId, username } = data;
          const cleanCode = (roomCode || '').toUpperCase().trim();
          const room = rooms.get(cleanCode);

          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found. Check the room code.' }));
            return;
          }

          if (room.players.size >= 4) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room is already full (maximum 4 racers).' }));
            return;
          }

          if (room.status !== 'lobby') {
            ws.send(JSON.stringify({ type: 'error', message: 'Race is already in progress in this room.' }));
            return;
          }

          // Pick an unused lane
          const usedLanes = new Set(Array.from(room.players.values()).map(p => p.lane));
          let freeLane = 0;
          for (let l = 0; l < 4; l++) {
            if (!usedLanes.has(l)) {
              freeLane = l;
              break;
            }
          }

          const session: PlayerSession = {
            ws,
            id: playerId,
            name: username || `Racer ${room.players.size + 1}`,
            roomCode: cleanCode,
            isHost: false,
            isReady: false,
            lane: freeLane,
            color: CAR_COLORS[freeLane],
            progress: 0,
            wpm: 0,
            accuracy: 100,
            rank: room.players.size + 1,
          };

          room.players.set(playerId, session);
          currentRoomCode = cleanCode;
          currentPlayerId = playerId;

          broadcastToRoom(room, {
            type: 'room_updated',
            roomState: getRoomSnapshot(room),
          });
        }
        else if (type === 'toggle_ready') {
          if (!currentRoomCode || !currentPlayerId) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          const player = room.players.get(currentPlayerId);
          if (player) {
            player.isReady = !player.isReady;
            broadcastToRoom(room, {
              type: 'room_updated',
              roomState: getRoomSnapshot(room),
            });
          }
        }
        else if (type === 'start_race') {
          if (!currentRoomCode || !currentPlayerId) return;
          const room = rooms.get(currentRoomCode);
          if (!room || room.hostId !== currentPlayerId) return;

          room.status = 'countdown';
          room.countdown = 3;
          broadcastToRoom(room, {
            type: 'countdown_start',
            countdown: 3,
            roomState: getRoomSnapshot(room),
          });

          // Server synchronized 3.. 2.. 1.. GO!
          let count = 3;
          const timer = setInterval(() => {
            count--;
            if (count > 0) {
              room.countdown = count;
              broadcastToRoom(room, {
                type: 'countdown_tick',
                countdown: count,
              });
            } else {
              clearInterval(timer);
              room.status = 'racing';
              room.raceStartTime = Date.now();
              broadcastToRoom(room, {
                type: 'race_started',
                raceStartTime: room.raceStartTime,
                roomState: getRoomSnapshot(room),
              });
            }
          }, 1000);
        }
        else if (type === 'progress_update') {
          if (!currentRoomCode || !currentPlayerId) return;
          const room = rooms.get(currentRoomCode);
          if (!room || room.status !== 'racing') return;

          const player = room.players.get(currentPlayerId);
          if (player) {
            player.progress = data.progress;
            player.wpm = data.wpm;
            player.accuracy = data.accuracy;

            // Recalculate ranks across players
            const sorted = Array.from(room.players.values()).sort((a, b) => {
              if (b.progress !== a.progress) return b.progress - a.progress;
              return b.wpm - a.wpm;
            });
            sorted.forEach((p, idx) => {
              p.rank = idx + 1;
            });

            // Broadcast delta
            broadcastToRoom(room, {
              type: 'progress_broadcast',
              playerId: currentPlayerId,
              progress: player.progress,
              wpm: player.wpm,
              accuracy: player.accuracy,
              rank: player.rank,
              allRanks: sorted.map(p => ({ id: p.id, rank: p.rank })),
            });
          }
        }
        else if (type === 'leave_room') {
          cleanUpPlayer();
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    const cleanUpPlayer = () => {
      if (currentRoomCode && currentPlayerId) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          room.players.delete(currentPlayerId);
          if (room.players.size === 0) {
            // Delete empty room
            rooms.delete(currentRoomCode);
          } else {
            // Reassign host if host left
            if (room.hostId === currentPlayerId) {
              const nextHost = room.players.values().next().value;
              if (nextHost) {
                room.hostId = nextHost.id;
                nextHost.isHost = true;
              }
            }
            broadcastToRoom(room, {
              type: 'player_left',
              playerId: currentPlayerId,
              roomState: getRoomSnapshot(room),
            });
          }
        }
        currentRoomCode = null;
        currentPlayerId = null;
      }
    };

    ws.on('close', cleanUpPlayer);
    ws.on('error', cleanUpPlayer);
  });

  // Clean up stale abandoned rooms every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
      if (now - room.createdAt > 3600000 || room.players.size === 0) {
        rooms.delete(code);
      }
    }
  }, 300000);

  // Serve static assets or mount Vite middleware in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TypeIgnite server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
