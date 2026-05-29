"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RealtimeGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const socket_io_1 = require("socket.io");
const event_types_1 = require("../../events/event-types");
let RealtimeGateway = RealtimeGateway_1 = class RealtimeGateway {
    logger = new common_1.Logger(RealtimeGateway_1.name);
    server;
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleSubscribe(client, payload) {
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
    handleUnsubscribe(client, payload) {
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
    handleTaskStatusChanged(event) {
        this.broadcastToRooms(event, 'task.status_changed');
    }
    handleAlertCreated(event) {
        this.broadcastToRooms(event, 'alert.created');
    }
    handleReportGenerated(event) {
        this.broadcastToRooms(event, 'report.generated');
    }
    handleAiJobSuccess(event) {
        this.broadcastToRooms(event, 'ai_job.success');
    }
    handleAiJobFail(event) {
        this.broadcastToRooms(event, 'ai_job.fail');
    }
    handleNotificationCreated(event) {
        this.broadcastToRooms(event, 'notification.created');
    }
    broadcastToRooms(event, eventName) {
        const data = {
            event_type: event.eventType,
            aggregate_type: event.aggregateType,
            aggregate_id: String(event.aggregateId),
            payload: event.payload,
            timestamp: new Date().toISOString(),
        };
        const payload = event.payload || {};
        const userId = payload.owner_id || payload.user_id || payload.actor_id;
        if (userId) {
            this.server.to(`user:${userId}`).emit(eventName, data);
            this.logger.debug(`Broadcast ${eventName} to room user:${userId}`);
        }
        const projectId = payload.project_id;
        if (projectId) {
            this.server.to(`project:${projectId}`).emit(eventName, data);
            this.logger.debug(`Broadcast ${eventName} to room project:${projectId}`);
        }
        if (!userId && !projectId) {
            this.server.emit(eventName, data);
            this.logger.debug(`Broadcast ${eventName} to all clients`);
        }
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RealtimeGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleUnsubscribe", null);
__decorate([
    (0, event_emitter_1.OnEvent)(event_types_1.EventTypes.TASK_STATUS_CHANGED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleTaskStatusChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)(event_types_1.EventTypes.ALERT_CREATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleAlertCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(event_types_1.EventTypes.REPORT_GENERATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleReportGenerated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(event_types_1.EventTypes.AI_JOB_SUCCESS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleAiJobSuccess", null);
__decorate([
    (0, event_emitter_1.OnEvent)(event_types_1.EventTypes.AI_JOB_FAIL),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleAiJobFail", null);
__decorate([
    (0, event_emitter_1.OnEvent)(event_types_1.EventTypes.NOTIFICATION_CREATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleNotificationCreated", null);
exports.RealtimeGateway = RealtimeGateway = RealtimeGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        namespace: '/realtime',
    })
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map