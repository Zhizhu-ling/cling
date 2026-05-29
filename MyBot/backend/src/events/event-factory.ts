import { v4 as uuidv4 } from 'uuid';
import { DomainEvent } from './domain-event.interface';

/**
 * Parameters for creating a domain event.
 */
export interface CreateDomainEventParams {
  /** The event type constant (e.g., EventTypes.TASK_CREATED) */
  eventType: string;

  /** ID of the actor (user) who triggered the event */
  actorId: string;

  /** Type of the entity (e.g., 'task', 'requirement', 'ai_job') */
  entityType: string;

  /** ID of the entity this event relates to */
  entityId: string;

  /** Event-specific payload data */
  payload: Record<string, any>;

  /** Request ID for tracing (optional, auto-generated if not provided) */
  requestId?: string;
}

/**
 * Creates a properly formatted domain event with a UUID event_id and ISO timestamp.
 *
 * @param params - The event creation parameters
 * @returns A fully populated DomainEvent
 */
export function createDomainEvent(params: CreateDomainEventParams): DomainEvent {
  return {
    event_id: uuidv4(),
    event_type: params.eventType,
    request_id: params.requestId ?? uuidv4(),
    timestamp: new Date().toISOString(),
    actor_id: params.actorId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    payload: params.payload,
  };
}
