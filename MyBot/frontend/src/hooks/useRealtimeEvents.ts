import { useEffect, useRef } from 'react';
import { wsManager } from '@/services/websocket';
import type { RealtimeEvent, RealtimeEventData, RealtimeEventHandler } from '@/services/websocket';

/**
 * React hook that subscribes to one or more realtime WebSocket events.
 *
 * Automatically subscribes on mount and unsubscribes on unmount.
 * The callback is kept stable via a ref to avoid unnecessary re-subscriptions
 * when the callback identity changes.
 *
 * @param events - A single event name or array of event names to listen for
 * @param callback - Handler invoked when any of the specified events are received
 *
 * @example
 * ```tsx
 * // Listen for task status changes to refresh the board
 * useRealtimeEvents('task.status_changed', (data) => {
 *   refreshBoard();
 * });
 *
 * // Listen for multiple events
 * useRealtimeEvents(['alert.created', 'notification.created'], (data) => {
 *   refreshDashboard();
 * });
 * ```
 *
 * Validates: Requirements 7.4, 9.1
 */
export function useRealtimeEvents(
  events: RealtimeEvent | RealtimeEvent[],
  callback: (data: RealtimeEventData) => void,
): void {
  // Keep a stable reference to the latest callback to avoid re-subscribing
  const callbackRef = useRef<(data: RealtimeEventData) => void>(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const eventList = Array.isArray(events) ? events : [events];

    const handler: RealtimeEventHandler = (data) => {
      callbackRef.current(data);
    };

    // Subscribe to all specified events
    for (const event of eventList) {
      wsManager.on(event, handler);
    }

    // Unsubscribe on unmount
    return () => {
      for (const event of eventList) {
        wsManager.off(event, handler);
      }
    };
  }, [events]);
}
