"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDomainEvent = createDomainEvent;
const uuid_1 = require("uuid");
function createDomainEvent(params) {
    return {
        event_id: (0, uuid_1.v4)(),
        event_type: params.eventType,
        request_id: params.requestId ?? (0, uuid_1.v4)(),
        timestamp: new Date().toISOString(),
        actor_id: params.actorId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        payload: params.payload,
    };
}
//# sourceMappingURL=event-factory.js.map