import { io, Socket } from 'socket.io-client';

/**
 * Realtime event names emitted by the backend WebSocket gateway.
 */
export type RealtimeEvent =
  | 'task.status_changed'
  | 'alert.created'
  | 'report.generated'
  | 'ai_job.success'
  | 'ai_job.fail'
  | 'notification.created';

/**
 * Payload shape received from the backend for all realtime events.
 */
export interface RealtimeEventData {
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

/**
 * Subscription rooms payload sent to the backend.
 */
export interface SubscribePayload {
  user_id?: string;
  project_id?: string;
}

/**
 * Event handler callback type.
 */
export type RealtimeEventHandler = (data: RealtimeEventData) => void;

/**
 * WebSocket connection manager with auto-reconnect and room-based subscriptions.
 *
 * Connects to the backend /realtime namespace using socket.io-client.
 * Provides methods to subscribe to rooms, listen for events, and manage
 * the connection lifecycle.
 *
 * Validates: Requirements 7.4, 9.1
 */
class WebSocketManager {
  private socket: Socket | null = null;
  private pendingRooms: SubscribePayload | null = null;

  /**
   * Connect to the backend WebSocket server at the /realtime namespace.
   * Uses auto-reconnect with exponential backoff (1s initial, 10s max).
   *
   * If already connected, this is a no-op.
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    // Determine the WebSocket URL based on the current environment.
    // In development, Vite proxies /api but socket.io needs a direct connection.
    // In production, the socket connects to the same origin.
    const url = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

    this.socket = io(`${url}/realtime`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      autoConnect: true,
      auth: {
        token: localStorage.getItem('token') || '',
      },
    });

    this.socket.on('connect', () => {
      // Re-subscribe to rooms on reconnect
      if (this.pendingRooms) {
        this.socket?.emit('subscribe', this.pendingRooms);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server and clean up resources.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.pendingRooms = null;
  }

  /**
   * Subscribe to rooms (user_id and/or project_id).
   * Rooms are persisted so they can be re-subscribed on reconnect.
   */
  subscribe(rooms: SubscribePayload): void {
    this.pendingRooms = { ...this.pendingRooms, ...rooms };

    if (this.socket?.connected) {
      this.socket.emit('subscribe', rooms);
    }
  }

  /**
   * Unsubscribe from rooms.
   */
  unsubscribe(rooms: SubscribePayload): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', rooms);
    }

    // Remove from pending rooms
    if (this.pendingRooms) {
      if (rooms.user_id && this.pendingRooms.user_id === rooms.user_id) {
        delete this.pendingRooms.user_id;
      }
      if (rooms.project_id && this.pendingRooms.project_id === rooms.project_id) {
        delete this.pendingRooms.project_id;
      }
    }
  }

  /**
   * Register an event handler for a specific realtime event.
   */
  on(event: RealtimeEvent, handler: RealtimeEventHandler): void {
    this.socket?.on(event, handler as (...args: unknown[]) => void);
  }

  /**
   * Remove an event handler for a specific realtime event.
   */
  off(event: RealtimeEvent, handler: RealtimeEventHandler): void {
    this.socket?.off(event, handler as (...args: unknown[]) => void);
  }

  /**
   * Check if the WebSocket is currently connected.
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

/**
 * Singleton WebSocket manager instance for the application.
 */
export const wsManager = new WebSocketManager();
