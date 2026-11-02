interface Env {
  ROOMS: DurableObjectNamespace;
}

interface Player {
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
  players: Record<string, Player>;
  raceStartTime?: number;
  createdAt: number;
}

interface SocketInfo {
  roomCode: string;
  playerId: string;
}

const CAR_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({
        status: 'ok',
        service: 'typeignite-server',
      });
    }

    if (url.pathname !== '/ws') {
      return new Response('Not found', { status: 404 });
    }

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket upgrade required', { status: 426 });
    }

    const id = env.ROOMS.idFromName('global');
    const coordinator = env.ROOMS.get(id);

    return coordinator.fetch(request);
  },
};

export class RoomCoordinator {
  private ctx: DurableObjectState;
  private rooms: Record<string, Room> = {};
  private ready: Promise<void>;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;

    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.rooms =
        (await ctx.storage.get<Record<string, Room>>('rooms')) || {};
    });
  }

  private async saveRooms(): Promise<void> {
    await this.ctx.storage.put('rooms', this.rooms);
  }

  async fetch(request: Request): Promise<Response> {
    await this.ready;

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket upgrade required', { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private send(socket: WebSocket, data: unknown): void {
    try {
      socket.send(JSON.stringify(data));
    } catch {
      // Ignore sockets that are no longer connected.
    }
  }

  private broadcast(roomCode: string, data: unknown): void {
    for (const socket of this.ctx.getWebSockets()) {
      const info = socket.deserializeAttachment() as SocketInfo | null;

      if (info?.roomCode === roomCode) {
        this.send(socket, data);
      }
    }
  }

  private getSocketInfo(socket: WebSocket): SocketInfo | null {
    return socket.deserializeAttachment() as SocketInfo | null;
  }

  private getRoomSnapshot(room: Room) {
    return {
      roomCode: room.code,
      hostId: room.hostId,
      status: room.status,
      countdown: room.countdown,
      seed: room.seed,
      raceStartTime: room.raceStartTime,
      players: room.players,
    };
  }

  private getRoomForSocket(socket: WebSocket): {
    room: Room;
    info: SocketInfo;
  } | null {
    const info = this.getSocketInfo(socket);

    if (!info) return null;

    const room = this.rooms[info.roomCode];

    if (!room || !room.players[info.playerId]) return null;

    return { room, info };
  }

  private generateRoomCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let attempt = 0; attempt < 100; attempt++) {
      let code = '';

      for (let i = 0; i < 6; i++) {
        code += characters[
          Math.floor(Math.random() * characters.length)
        ];
      }

      if (!this.rooms[code]) return code;
    }

    throw new Error('Could not generate a room code. Try again.');
  }

  private sendError(socket: WebSocket, message: string): void {
    this.send(socket, {
      type: 'error',
      message,
    });
  }

  private attachPlayer(
    socket: WebSocket,
    roomCode: string,
    playerId: string
  ): void {
    socket.serializeAttachment({
      roomCode,
      playerId,
    } satisfies SocketInfo);
  }

  private async createRoom(
    socket: WebSocket,
    data: any
  ): Promise<void> {
    const playerId = String(data.playerId || '');
    const username = String(data.username || 'Player').slice(0, 16);

    if (!playerId) {
      this.sendError(socket, 'A player ID is required.');
      return;
    }

    const code = this.generateRoomCode();

    const player: Player = {
      id: playerId,
      name: username,
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

    const room: Room = {
      code,
      hostId: playerId,
      status: 'lobby',
      countdown: 0,
      seed: Math.floor(Math.random() * 2147483647),
      players: {
        [playerId]: player,
      },
      createdAt: Date.now(),
    };

    this.rooms[code] = room;
    this.attachPlayer(socket, code, playerId);

    await this.saveRooms();

    this.send(socket, {
      type: 'room_joined',
      roomState: this.getRoomSnapshot(room),
      selfId: playerId,
    });
  }

  private async joinRoom(
    socket: WebSocket,
    data: any
  ): Promise<void> {
    const code = String(data.roomCode || '').trim().toUpperCase();
    const playerId = String(data.playerId || '');
    const username = String(data.username || 'Player').slice(0, 16);

    const room = this.rooms[code];

    if (!playerId) {
      this.sendError(socket, 'A player ID is required.');
      return;
    }

    if (!room) {
      this.sendError(socket, 'Room not found. Check the room code.');
      return;
    }

    if (room.status !== 'lobby') {
      this.sendError(socket, 'This race has already started.');
      return;
    }

    if (Object.keys(room.players).length >= 4) {
      this.sendError(socket, 'This room is full.');
      return;
    }

    if (room.players[playerId]) {
      this.attachPlayer(socket, code, playerId);

      this.send(socket, {
        type: 'room_updated',
        roomState: this.getRoomSnapshot(room),
      });

      return;
    }

    const usedLanes = Object.values(room.players).map(
      (player) => player.lane
    );

    const lane = [0, 1, 2, 3].find(
      (number) => !usedLanes.includes(number)
    );

    if (lane === undefined) {
      this.sendError(socket, 'No free player lane is available.');
      return;
    }

    room.players[playerId] = {
      id: playerId,
      name: username,
      roomCode: code,
      isHost: false,
      isReady: false,
      lane,
      color: CAR_COLORS[lane],
      progress: 0,
      wpm: 0,
      accuracy: 100,
      rank: Object.keys(room.players).length + 1,
    };

    this.attachPlayer(socket, code, playerId);

    await this.saveRooms();

    this.broadcast(code, {
      type: 'room_updated',
      roomState: this.getRoomSnapshot(room),
    });
  }

  private async toggleReady(socket: WebSocket): Promise<void> {
    const result = this.getRoomForSocket(socket);

    if (!result) {
      this.sendError(socket, 'You are not in a room.');
      return;
    }

    const { room, info } = result;

    if (room.status !== 'lobby') return;

    const player = room.players[info.playerId];
    player.isReady = !player.isReady;

    await this.saveRooms();

    this.broadcast(room.code, {
      type: 'room_updated',
      roomState: this.getRoomSnapshot(room),
    });
  }

  private async startRace(socket: WebSocket): Promise<void> {
    const result = this.getRoomForSocket(socket);

    if (!result) {
      this.sendError(socket, 'You are not in a room.');
      return;
    }

    const { room, info } = result;

    if (room.hostId !== info.playerId) {
      this.sendError(socket, 'Only the room host can start the race.');
      return;
    }

    if (room.status !== 'lobby') return;

    const players = Object.values(room.players);

    if (players.length < 2) {
      this.sendError(socket, 'At least two players are needed to race.');
      return;
    }

    const unreadyPlayer = players.find(
      (player) => !player.isReady
    );

    if (unreadyPlayer) {
      this.sendError(socket, 'Wait until every player is ready.');
      return;
    }

    room.status = 'countdown';
    room.countdown = 3;

    await this.saveRooms();

    this.broadcast(room.code, {
      type: 'countdown_start',
      countdown: 3,
    });

    const code = room.code;

    const tick = async () => {
      const currentRoom = this.rooms[code];

      if (!currentRoom || currentRoom.status !== 'countdown') {
        return;
      }

      currentRoom.countdown--;

      if (currentRoom.countdown > 0) {
        await this.saveRooms();

        this.broadcast(code, {
          type: 'countdown_tick',
          countdown: currentRoom.countdown,
        });

        setTimeout(tick, 1000);
        return;
      }

      currentRoom.countdown = 0;
      currentRoom.status = 'racing';
      currentRoom.raceStartTime = Date.now();

      await this.saveRooms();

      this.broadcast(code, {
        type: 'race_started',
        roomState: this.getRoomSnapshot(currentRoom),
      });
    };

    setTimeout(tick, 1000);
  }

  private async updateProgress(
    socket: WebSocket,
    data: any
  ): Promise<void> {
    const result = this.getRoomForSocket(socket);

    if (!result) return;

    const { room, info } = result;

    if (room.status !== 'racing') return;

    const player = room.players[info.playerId];

    player.progress = Math.max(
      0,
      Math.min(100, Number(data.progress) || 0)
    );

    player.wpm = Math.max(0, Number(data.wpm) || 0);

    player.accuracy = Math.max(
      0,
      Math.min(100, Number(data.accuracy) || 0)
    );

    const sortedPlayers = Object.values(room.players).sort(
      (a, b) => b.progress - a.progress || b.wpm - a.wpm
    );

    sortedPlayers.forEach((item, index) => {
      item.rank = index + 1;
    });

    await this.saveRooms();

    this.broadcast(room.code, {
      type: 'progress_broadcast',
      playerId: player.id,
      progress: player.progress,
      wpm: player.wpm,
      accuracy: player.accuracy,
      rank: player.rank,
      allRanks: sortedPlayers.map((item) => ({
        playerId: item.id,
        rank: item.rank,
      })),
    });
  }

  private async leaveRoom(
    socket: WebSocket,
    announce = true
  ): Promise<void> {
    const info = this.getSocketInfo(socket);

    if (!info) return;

    const room = this.rooms[info.roomCode];

    if (!room || !room.players[info.playerId]) {
      socket.serializeAttachment(null);
      return;
    }

    delete room.players[info.playerId];
    socket.serializeAttachment(null);

    const remainingPlayers = Object.values(room.players);

    if (remainingPlayers.length === 0) {
      delete this.rooms[room.code];
      await this.saveRooms();
      return;
    }

    if (room.hostId === info.playerId) {
      const newHost = remainingPlayers[0];
      room.hostId = newHost.id;
      newHost.isHost = true;
    }

    await this.saveRooms();

    if (announce) {
      this.broadcast(room.code, {
        type: 'player_left',
        playerId: info.playerId,
        roomState: this.getRoomSnapshot(room),
      });
    }
  }

  async webSocketMessage(
    socket: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    await this.ready;

    let data: any;

    try {
      data = JSON.parse(
        typeof message === 'string'
          ? message
          : new TextDecoder().decode(message)
      );
    } catch {
      this.sendError(socket, 'Invalid message format.');
      return;
    }

    switch (data.type) {
      case 'create_room':
        await this.createRoom(socket, data);
        break;

      case 'join_room':
        await this.joinRoom(socket, data);
        break;

      case 'toggle_ready':
        await this.toggleReady(socket);
        break;

      case 'start_race':
        await this.startRace(socket);
        break;

      case 'progress_update':
        await this.updateProgress(socket, data);
        break;

      case 'leave_room':
        await this.leaveRoom(socket);
        break;

      default:
        this.sendError(socket, 'Unknown multiplayer command.');
    }
  }

  async webSocketClose(
    socket: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    await this.ready;
    await this.leaveRoom(socket);
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    await this.ready;
    await this.leaveRoom(socket);
  }
}
