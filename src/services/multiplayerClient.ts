import { MultiplayerRoomState } from '../types/game';

type EventCallback = (data: any) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;

  public connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnecting = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type) {
              const callbacks = this.listeners.get(data.type);
              if (callbacks) {
                callbacks.forEach(cb => cb(data));
              }
            }
          } catch (err) {
            console.error('Socket parse error:', err);
          }
        };

        this.ws.onerror = (err) => {
          this.isConnecting = false;
          const errorCallbacks = this.listeners.get('error');
          if (errorCallbacks) {
            errorCallbacks.forEach(cb => cb({ type: 'error', message: 'Connection error' }));
          }
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          const closeCallbacks = this.listeners.get('close');
          if (closeCallbacks) {
            closeCallbacks.forEach(cb => cb({}));
          }
        };
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });
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
