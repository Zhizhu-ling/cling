import { createDomainEvent, CreateDomainEventParams } from './event-factory';
import { EventTypes } from './event-types';

describe('createDomainEvent', () => {
  const baseParams: CreateDomainEventParams = {
    eventType: EventTypes.TASK_CREATED,
    actorId: 'user-123',
    entityType: 'task',
    entityId: '456',
    payload: { title: 'Test task', status: 'todo' },
  };

  it('should create a domain event with all required fields', () => {
    const event = createDomainEvent(baseParams);

    expect(event.event_id).toBeDefined();
    expect(event.event_type).toBe('task.created');
    expect(event.request_id).toBeDefined();
    expect(event.timestamp).toBeDefined();
    expect(event.actor_id).toBe('user-123');
    expect(event.entity_type).toBe('task');
    expect(event.entity_id).toBe('456');
    expect(event.payload).toEqual({ title: 'Test task', status: 'todo' });
  });

  it('should generate a valid UUID v4 for event_id', () => {
    const event = createDomainEvent(baseParams);
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(event.event_id).toMatch(uuidV4Regex);
  });

  it('should generate an ISO 8601 timestamp', () => {
    const before = new Date().toISOString();
    const event = createDomainEvent(baseParams);
    const after = new Date().toISOString();

    expect(event.timestamp >= before).toBe(true);
    expect(event.timestamp <= after).toBe(true);
  });

  it('should use provided requestId when given', () => {
    const event = createDomainEvent({
      ...baseParams,
      requestId: 'req-abc-123',
    });

    expect(event.request_id).toBe('req-abc-123');
  });

  it('should auto-generate requestId when not provided', () => {
    const event = createDomainEvent(baseParams);
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(event.request_id).toMatch(uuidV4Regex);
  });

  it('should produce unique event_ids for each call', () => {
    const event1 = createDomainEvent(baseParams);
    const event2 = createDomainEvent(baseParams);

    expect(event1.event_id).not.toBe(event2.event_id);
  });
});
