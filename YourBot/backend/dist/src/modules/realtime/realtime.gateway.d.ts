import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
interface OutboxEventPayload {
    eventType: string;
    aggregateType: string;
    aggregateId: bigint;
    payload: Record<string, any>;
    outboxEventId: bigint;
}
interface JoinRoomPayload {
    user_id?: string;
    project_id?: string;
}
export declare class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger;
    server: Server;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleSubscribe(client: Socket, payload: JoinRoomPayload): {
        event: string;
        data: {
            success: boolean;
        };
    };
    handleUnsubscribe(client: Socket, payload: JoinRoomPayload): {
        event: string;
        data: {
            success: boolean;
        };
    };
    handleTaskStatusChanged(event: OutboxEventPayload): void;
    handleAlertCreated(event: OutboxEventPayload): void;
    handleReportGenerated(event: OutboxEventPayload): void;
    handleAiJobSuccess(event: OutboxEventPayload): void;
    handleAiJobFail(event: OutboxEventPayload): void;
    handleNotificationCreated(event: OutboxEventPayload): void;
    private broadcastToRooms;
}
export {};
