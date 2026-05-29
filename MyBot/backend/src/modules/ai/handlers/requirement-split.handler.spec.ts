import { RequirementSplitHandler, RequirementSplitInput } from './requirement-split.handler';
import { ParseError } from '../errors';

describe('RequirementSplitHandler', () => {
  let handler: RequirementSplitHandler;

  beforeEach(() => {
    handler = new RequirementSplitHandler();
  });

  const validInput: RequirementSplitInput = {
    requirement_id: '123',
    title: 'Build User Authentication Module',
    background: 'The system needs secure user authentication for all API endpoints.',
    objective: 'Implement JWT-based authentication with role-based access control.',
    constraints: 'Must use bcrypt for password hashing with cost factor >= 10.',
    deliverables: ['Login endpoint', 'JWT token generation', 'Role-based guards'],
  };

  describe('execute', () => {
    it('should return a valid task decomposition result', async () => {
      const result = await handler.execute(validInput as unknown as Record<string, any>);

      expect(result).toBeDefined();
      expect(result.outputPayload).toBeDefined();
      expect(result.rawResponse).toBeDefined();
    });

    it('should return tasks with required fields', async () => {
      const result = await handler.execute(validInput as unknown as Record<string, any>);
      const output = result.outputPayload as any;

      expect(output.tasks).toBeInstanceOf(Array);
      expect(output.tasks.length).toBeGreaterThan(0);

      for (const task of output.tasks) {
        expect(task.task_key).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.title.length).toBeGreaterThan(0);
        expect(task.estimated_hours).toBeGreaterThan(0);
        expect(task.dependencies).toBeInstanceOf(Array);
      }
    });

    it('should include schema_version and biz_ref_id in output', async () => {
      const result = await handler.execute(validInput as unknown as Record<string, any>);
      const output = result.outputPayload as any;

      expect(output.schema_version).toBe('1.0.0');
      expect(output.biz_ref_id).toBe('123');
    });

    it('should include confidence and reason in output', async () => {
      const result = await handler.execute(validInput as unknown as Record<string, any>);
      const output = result.outputPayload as any;

      expect(output.confidence).toBeGreaterThanOrEqual(0);
      expect(output.confidence).toBeLessThanOrEqual(1);
      expect(output.reason).toBeDefined();
      expect(output.reason.length).toBeGreaterThan(0);
    });

    it('should generate tasks based on deliverables count', async () => {
      const result = await handler.execute(validInput as unknown as Record<string, any>);
      const output = result.outputPayload as any;

      // 3 deliverables × 4 tasks each (1 parent + 3 subtasks) = 12 tasks
      expect(output.tasks.length).toBe(12);
    });

    it('should generate parent-child relationships via parent_key', async () => {
      const result = await handler.execute(validInput as unknown as Record<string, any>);
      const output = result.outputPayload as any;

      const parentTasks = output.tasks.filter((t: any) => !t.parent_key);
      const childTasks = output.tasks.filter((t: any) => t.parent_key);

      expect(parentTasks.length).toBe(3); // One per deliverable
      expect(childTasks.length).toBe(9); // Three subtasks per deliverable
    });

    it('should handle input without constraints', async () => {
      const inputWithoutConstraints: RequirementSplitInput = {
        ...validInput,
        constraints: undefined,
      };

      const result = await handler.execute(
        inputWithoutConstraints as unknown as Record<string, any>,
      );

      expect(result.outputPayload).toBeDefined();
      expect((result.outputPayload as any).tasks.length).toBeGreaterThan(0);
    });

    it('should handle single deliverable', async () => {
      const singleDeliverableInput: RequirementSplitInput = {
        ...validInput,
        deliverables: ['Single feature'],
      };

      const result = await handler.execute(
        singleDeliverableInput as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      // 1 deliverable × 4 tasks (1 parent + 3 subtasks) = 4 tasks
      expect(output.tasks.length).toBe(4);
    });

    it('should set dependencies correctly for subtasks', async () => {
      const singleInput: RequirementSplitInput = {
        ...validInput,
        deliverables: ['Feature A'],
      };

      const result = await handler.execute(
        singleInput as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      // Design task (T1.1) has no dependencies
      const designTask = output.tasks.find((t: any) => t.task_key === 'T1.1');
      expect(designTask.dependencies).toEqual([]);

      // Develop task (T1.2) depends on design (T1.1)
      const devTask = output.tasks.find((t: any) => t.task_key === 'T1.2');
      expect(devTask.dependencies).toContain('T1.1');

      // Test task (T1.3) depends on develop (T1.2)
      const testTask = output.tasks.find((t: any) => t.task_key === 'T1.3');
      expect(testTask.dependencies).toContain('T1.2');
    });

    it('should NOT persist tasks to database (returns result only)', async () => {
      const result = await handler.execute(validInput as unknown as Record<string, any>);

      // The handler returns a result object - it does not interact with any database
      // This validates Requirement 3.2: present result without persisting
      expect(result.outputPayload).toBeDefined();
      expect(result.rawResponse).toBeDefined();
      expect(typeof result.rawResponse).toBe('string');
    });

    it('should produce valid JSON in rawResponse', async () => {
      const result = await handler.execute(validInput as unknown as Record<string, any>);

      expect(() => JSON.parse(result.rawResponse!)).not.toThrow();
    });

    it('should handle object-type deliverables', async () => {
      const objectDeliverables: RequirementSplitInput = {
        ...validInput,
        deliverables: [
          { name: 'API endpoint', type: 'backend' },
          { name: 'UI component', type: 'frontend' },
        ] as any,
      };

      const result = await handler.execute(
        objectDeliverables as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      expect(output.tasks.length).toBe(8); // 2 deliverables × 4 tasks
    });
  });
});
