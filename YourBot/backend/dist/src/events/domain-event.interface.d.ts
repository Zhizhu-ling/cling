export interface DomainEvent {
    event_id: string;
    event_type: string;
    request_id: string;
    timestamp: string;
    actor_id: string;
    entity_type: string;
    entity_id: string;
    payload: Record<string, any>;
}
