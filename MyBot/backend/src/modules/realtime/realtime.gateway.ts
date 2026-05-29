import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { EventTypes } from '../../events/event-types';

/**
 * Payload shape emitted by the OutboxWorker via EventEmitter2.
 */
interface OutboxEventPayload {
  eventType: string;
  aggregateType: string;
  aggregateId: bigint;
  payload: Record<string, any>;
  outboxEventId: bigint;
}

/**
 * Payload sent by clients when subscribing to rooms.
 */
interface JoinRoomPayload {
  user_id?: string;
  project_id?: string;
}

/**
 * RealtimeGateway handles WebSocket connections and broadcasts domain events
 * to connected clients using room-based subscriptions.
 *
 * Clients can join rooms based on:
 * - user_id: receives events relevant to a specific user (e.g., notifications, task assignments)
 * - project_id: receives events relevant to a specific project (e.g., task status changes, reports)
 *
 * Domain events are received via EventEmitter2 (dispatched by OutboxWorker)
 * and broadcast to appropriate rooms.
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  /**
   * Handle new client connection.
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection. Clean up room memberships automatically handled by socket.io.
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Handle client request to join rooms.
   * Clients send a 'subscribe' message with user_id and/or project_id
   * to receive events for those entities.
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    if (payload.user_id) {
      const room = `user:${payload.user_id}`;
      client.join(room);
      this.logger.debug(`Client ${client.id} joined room: ${room}`);
    }

    if (payload.project_id) {
      const room = `project:${payload.project_id}`;
      client.join(room);
      this.logger.debug(`Client ${client.id} joined room: ${room}`);
    }

    return { event: 'subscribed', data: { success: true } };
  }

  /**
   * Handle client request to leave rooms.
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    if (payload.user_id) {
      const room = `user:${payload.user_id}`;
      client.leave(room);
      this.logger.debug(`Client ${client.id} left room: ${room}`);
    }

    if (payload.project_id) {
      const room = `project:${payload.project_id}`;
      client.leave(room);
      this.logger.debug(`Client ${client.id} left room: ${room}`);
    }

    return { event: 'unsubscribed', data: { success: true } };
  }

  // ─── Domain Event Listeners ────────────────────────────────────────────

  @OnEvent(EventTypes.TASK_STATUS_CHANGED)
  handleTaskStatusChanged(event: OutboxEventPayload) {
    this.broadcastToRooms(event, 'task.status_changed');
  }

  @OnEvent(EventTypes.ALERT_CREATED)
  handleAlertCreated(event: OutboxEventPayload) {
    this.broadcastToRooms(event, 'alert.created');
  }

  @OnEvent(EventTypes.REPORT_GENERATED)
  handleReportGenerated(event: OutboxEventPayload) {
    this.broadcastToRooms(event, 'report.generated');
  }

  @OnEvent(EventTypes.AI_JOB_SUCCESS)
  handleAiJobSuccess(event: OutboxEventPayload) {
    this.broadcastToRooms(event, 'ai_job.success');
  }

  @OnEvent(EventTypes.AI_JOB_FAIL)
  handleAiJobFail(event: OutboxEventPayload) {
    this.broadcastToRooms(event, 'ai_job.fail');
  }

  @OnEvent(EventTypes.NOTIFICATION_CREATED)
  handleNotificationCreated(event: OutboxEventPayload) {
    this.broadcastToRooms(event, 'notification.created');
  }

  // ─── Private Helpers ───────────────────────────────────────────────────

  /**
   * Broadcasts an event to relevant rooms based on the event payload.
   *
   * Routing logic:
   * - If payload contains `owner_id` or `user_id`, emit to `user:<id>` room
   * - If payload contains `project_id`, emit to `project:<id>` room
   * - Always emit to a global broadcast so any connected client can receive all events
   */
  private broadcastToRooms(event: OutboxEventPayload, eventName: string) {
    const data = {
      event_type: event.eventType,
      aggregate_type: event.aggregateType,
      aggregate_id: String(event.aggregateId),
      payload: event.payload,
      timestamp: new Date().toISOString(),
    };

    // Determine target rooms from the event payload
    const payload = event.payload || {};

    // Broadcast to user-specific room
    const userId = payload.owner_id || payload.user_id || payload.actor_id;
    if (userId) {
      this.server.to(`user:${userId}`).emit(eventName, data);
      this.logger.debug(
        `Broadcast ${eventName} to room user:${userId}`,
      );
    }

    // Broadcast to project-specific room
    const projectId = payload.project_id;
    if (projectId) {
      this.server.to(`project:${projectId}`).emit(eventName, data);
      this.logger.debug(
        `Broadcast ${eventName} to room project:${projectId}`,
      );
    }

    // If no specific room was targeted, broadcast to all connected clients
    if (!userId && !projectId) {
      this.server.emit(eventName, data);
      this.logger.debug(`Broadcast ${eventName} to all clients`);
    }
  }
}
