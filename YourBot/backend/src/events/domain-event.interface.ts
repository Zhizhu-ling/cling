/**
 * Unified domain event payload format.
 * All domain events emitted through the event bus conform to this interface.
 */
export interface DomainEvent {
  /** Unique identifier for this event instance (UUID v4) */
  event_id: string;

  /** The type of event (e.g., 'task.created', 'ai_job.success') */
  event_type: string;

  /** Request ID for tracing (correlates with the API request that triggered this event) */
  request_id: string;

  /** ISO 8601 timestamp of when the event occurred */
  timestamp: string;

  /** ID of the actor (user) who triggered the event */
  actor_id: string;

  /** Type of the entity this event relates to (e.g., 'task', 'requirement', 'ai_job') */
  entity_type: string;

  /** ID of the entity this event relates to */
  entity_id: string;

  /** Event-specific payload data */
  payload: Record<string, any>;
}
