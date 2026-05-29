import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeGateway } from './realtime.gateway';
import { Server, Socket } from 'socket.io';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let mockServer: Partial<Server>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeGateway],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);

    // Mock the WebSocket server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    gateway.server = mockServer as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should log client connection', () => {
      const mockClient = { id: 'test-client-1' } as Socket;
      expect(() => gateway.handleConnection(mockClient)).not.toThrow();
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      const mockClient = { id: 'test-client-1' } as Socket;
      expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
    });
  });

  describe('handleSubscribe', () => {
    it('should join user room when user_id is provided', () => {
      const mockClient = {
        id: 'test-client-1',
        join: jest.fn(),
      } as unknown as Socket;

      const result = gateway.handleSubscribe(mockClient, {
        user_id: '123',
      });

      expect(mockClient.join).toHaveBeenCalledWith('user:123');
      expect(result).toEqual({ event: 'subscribed', data: { success: true } });
    });

    it('should join project room when project_id is provided', () => {
      const mockClient = {
        id: 'test-client-1',
        join: jest.fn(),
      } as unknown as Socket;

      const result = gateway.handleSubscribe(mockClient, {
        project_id: '456',
      });

      expect(mockClient.join).toHaveBeenCalledWith('project:456');
      expect(result).toEqual({ event: 'subscribed', data: { success: true } });
    });

    it('should join both rooms when both user_id and project_id are provided', () => {
      const mockClient = {
        id: 'test-client-1',
        join: jest.fn(),
      } as unknown as Socket;

      const result = gateway.handleSubscribe(mockClient, {
        user_id: '123',
        project_id: '456',
      });

      expect(mockClient.join).toHaveBeenCalledWith('user:123');
      expect(mockClient.join).toHaveBeenCalledWith('project:456');
      expect(result).toEqual({ event: 'subscribed', data: { success: true } });
    });
  });

  describe('handleUnsubscribe', () => {
    it('should leave user room when user_id is provided', () => {
      const mockClient = {
        id: 'test-client-1',
        leave: jest.fn(),
      } as unknown as Socket;

      const result = gateway.handleUnsubscribe(mockClient, {
        user_id: '123',
      });

      expect(mockClient.leave).toHaveBeenCalledWith('user:123');
      expect(result).toEqual({
        event: 'unsubscribed',
        data: { success: true },
      });
    });

    it('should leave project room when project_id is provided', () => {
      const mockClient = {
        id: 'test-client-1',
        leave: jest.fn(),
      } as unknown as Socket;

      const result = gateway.handleUnsubscribe(mockClient, {
        project_id: '456',
      });

      expect(mockClient.leave).toHaveBeenCalledWith('project:456');
      expect(result).toEqual({
        event: 'unsubscribed',
        data: { success: true },
      });
    });
  });

  describe('domain event handlers', () => {
    const baseEvent = {
      eventType: 'task.status_changed',
      aggregateType: 'task',
      aggregateId: BigInt(1),
      payload: { owner_id: '10', project_id: '5', status: 'done' },
      outboxEventId: BigInt(100),
    };

    it('should broadcast task.status_changed to user room', () => {
      gateway.handleTaskStatusChanged(baseEvent);

      expect(mockServer.to).toHaveBeenCalledWith('user:10');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'task.status_changed',
        expect.objectContaining({
          event_type: 'task.status_changed',
          aggregate_type: 'task',
          aggregate_id: '1',
          payload: baseEvent.payload,
        }),
      );
    });

    it('should broadcast task.status_changed to project room', () => {
      gateway.handleTaskStatusChanged(baseEvent);

      expect(mockServer.to).toHaveBeenCalledWith('project:5');
    });

    it('should broadcast alert.created event', () => {
      const alertEvent = {
        ...baseEvent,
        eventType: 'alert.created',
        aggregateType: 'alert',
        payload: { user_id: '20', project_id: '3' },
      };

      gateway.handleAlertCreated(alertEvent);

      expect(mockServer.to).toHaveBeenCalledWith('user:20');
      expect(mockServer.to).toHaveBeenCalledWith('project:3');
    });

    it('should broadcast report.generated event', () => {
      const reportEvent = {
        ...baseEvent,
        eventType: 'report.generated',
        aggregateType: 'report',
        payload: { project_id: '7' },
      };

      gateway.handleReportGenerated(reportEvent);

      expect(mockServer.to).toHaveBeenCalledWith('project:7');
    });

    it('should broadcast ai_job.success event', () => {
      const aiEvent = {
        ...baseEvent,
        eventType: 'ai_job.success',
        aggregateType: 'ai_job',
        payload: { actor_id: '15' },
      };

      gateway.handleAiJobSuccess(aiEvent);

      expect(mockServer.to).toHaveBeenCalledWith('user:15');
    });

    it('should broadcast ai_job.fail event', () => {
      const aiEvent = {
        ...baseEvent,
        eventType: 'ai_job.fail',
        aggregateType: 'ai_job',
        payload: { actor_id: '15' },
      };

      gateway.handleAiJobFail(aiEvent);

      expect(mockServer.to).toHaveBeenCalledWith('user:15');
    });

    it('should broadcast notification.created to user room', () => {
      const notifEvent = {
        ...baseEvent,
        eventType: 'notification.created',
        aggregateType: 'notification',
        payload: { user_id: '30' },
      };

      gateway.handleNotificationCreated(notifEvent);

      expect(mockServer.to).toHaveBeenCalledWith('user:30');
    });

    it('should broadcast to all clients when no room identifiers in payload', () => {
      const genericEvent = {
        ...baseEvent,
        payload: {},
      };

      gateway.handleTaskStatusChanged(genericEvent);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'task.status_changed',
        expect.objectContaining({
          event_type: 'task.status_changed',
        }),
      );
    });
  });
});
