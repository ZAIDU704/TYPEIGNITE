import { MultiplayerRoomState } from '../types/game';

type EventCallback = (data: any) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isConnecting: boolean = false;
  private connectPromise: Promise<void> | null = null;
  private reconnectTimer: any = null;

  public connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.isConnecting = true;

    this.connectPromise = new Promise((resolve, reject) => {
      let settled = false;
      const wsUrl = 'wss://typeignite-server.faxilafaxila9.workers.dev/ws';

      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        this.isConnecting = false;
        this.connectPromise = null;

        const errorCallbacks = this.listeners.get('error');
        errorCallbacks?.forEach(cb =>
          cb({ type: 'error', message: error.message })
        );

        reject(error);
      };

      socket.onopen = () => {
        if (settled) return;
        settled = true;
        this.isConnecting = false;
        this.connectPromise = null;
        resolve();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type) {
            const callbacks = this.listeners.get(data.type);
            callbacks?.forEach(cb => cb(data));
          }
        } catch (err) {
          console.error('Socket parse error:', err);
        }
      };

      socket.onerror = () => {
        fail(new Error('Connection error'));
      };

      socket.onclose = () => {
        if (!settled) {
          fail(new Error('Connection closed before opening'));
        }

        this.isConnecting = false;
        const closeCallbacks = this.listeners.get('close');
        closeCallbacks?.forEach(cb => cb({}));
      };
    });

    return this.connectPromise;
  }

  public on(event: string, cb: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => {
      this.listeners.get(event)?.delete(cb);
    };
  }

  public send(type: string, payload: any = {}): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    }
  }

  public createRoom(playerId: string, username: string): void {
    this.send('create_room', { playerId, username });
  }

  public joinRoom(roomCode: string, playerId: string, username: string): void {
    this.send('join_room', { roomCode, playerId, username });
  }

  public toggleReady(): void {
    this.send('toggle_ready');
  }

  public startRace(): void {
    this.send('start_race');
  }

  public updateProgress(progress: number, wpm: number, accuracy: number): void {
    this.send('progress_update', { progress, wpm, accuracy });
  }

  public leaveRoom(): void {
    this.send('leave_room');
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }
}

export const multiplayerClient = new MultiplayerClient();
