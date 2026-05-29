import { DomainEvent } from './domain-event.interface';
export interface CreateDomainEventParams {
    eventType: string;
    actorId: string;
    entityType: string;
    entityId: string;
    payload: Record<string, any>;
    requestId?: string;
}
export declare function createDomainEvent(params: CreateDomainEventParams): DomainEvent;
