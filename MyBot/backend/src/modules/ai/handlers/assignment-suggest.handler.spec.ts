import {
  AssignmentSuggestHandler,
  AssignmentSuggestInput,
  buildAssignmentSuggestPrompt,
} from './assignment-suggest.handler';
import { AiJobHandlerResult } from '../interfaces';

describe('AssignmentSuggestHandler', () => {
  let handler: AssignmentSuggestHandler;

  beforeEach(() => {
    handler = new AssignmentSuggestHandler();
  });

  const createValidInput = (
    overrides?: Partial<AssignmentSuggestInput>,
  ): AssignmentSuggestInput => ({
    tasks: [
      {
        task_key: 'T1',
        title: 'Implement login page',
        description: 'Build the login form with validation',
        estimated_hours: 8,
        required_skills: ['React', 'TypeScript'],
        priority: 2,
      },
      {
        task_key: 'T2',
        title: 'Set up database schema',
        description: 'Design and implement PostgreSQL schema',
        estimated_hours: 4,
        required_skills: ['PostgreSQL', 'Prisma'],
        priority: 1,
      },
    ],
    members: [
      {
        member_id: '101',
        name: 'Alice',
        skills: ['React', 'TypeScript', 'CSS'],
        workload: 20,
        availability: 40,
        historical_success_rate: 0.9,
      },
      {
        member_id: '102',
        name: 'Bob',
        skills: ['PostgreSQL', 'Prisma', 'NestJS'],
        workload: 30,
        availability: 40,
        historical_success_rate: 0.85,
      },
      {
        member_id: '103',
        name: 'Charlie',
        skills: ['React', 'PostgreSQL', 'Docker'],
        workload: 35,
        availability: 40,
        historical_success_rate: 0.75,
      },
    ],
    biz_ref_id: 'req-1',
    ...overrides,
  });

  describe('execute', () => {
    it('should return suggestions for all input tasks', async () => {
      const input = createValidInput();
      const result: AiJobHandlerResult = await handler.execute(input);

      expect(result.outputPayload).toBeDefined();
      expect(result.rawResponse).toBeDefined();

      const output = result.outputPayload as any;
      expect(output.suggestions).toHaveLength(2);
      expect(output.suggestions[0].task_key).toBe('T1');
      expect(output.suggestions[1].task_key).toBe('T2');
    });

    it('should include required fields in each suggestion', async () => {
      const input = createValidInput();
      const result = await handler.execute(input);
      const output = result.outputPayload as any;

      for (const suggestion of output.suggestions) {
        expect(suggestion.task_key).toBeDefined();
        expect(suggestion.recommended_owner_id).toBeDefined();
        expect(suggestion.reason).toBeDefined();
        expect(suggestion.reason.length).toBeGreaterThan(0);
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
        expect(suggestion.alternatives).toBeDefined();
        expect(Array.isArray(suggestion.alternatives)).toBe(true);
      }
    });

    it('should recommend Alice for React/TypeScript task based on skill match', async () => {
      const input = createValidInput();
      const result = await handler.execute(input);
      const output = result.outputPayload as any;

      const t1Suggestion = output.suggestions.find(
        (s: any) => s.task_key === 'T1',
      );
      // Alice has React + TypeScript skills and lower workload
      expect(t1Suggestion.recommended_owner_id).toBe('101');
    });

    it('should recommend Bob for PostgreSQL/Prisma task based on skill match', async () => {
      const input = createValidInput();
      const result = await handler.execute(input);
      const output = result.outputPayload as any;

      const t2Suggestion = output.suggestions.find(
        (s: any) => s.task_key === 'T2',
      );
      // Bob has PostgreSQL + Prisma skills
      expect(t2Suggestion.recommended_owner_id).toBe('102');
    });

    it('should include alternatives for each suggestion', async () => {
      const input = createValidInput();
      const result = await handler.execute(input);
      const output = result.outputPayload as any;

      for (const suggestion of output.suggestions) {
        // With 3 members, there should be up to 2 alternatives
        expect(suggestion.alternatives.length).toBeGreaterThan(0);
        for (const alt of suggestion.alternatives) {
          expect(alt.owner_id).toBeDefined();
          expect(alt.reason).toBeDefined();
          expect(alt.reason.length).toBeGreaterThan(0);
        }
      }
    });

    it('should validate output against AssignmentSuggestionOutputSchema', async () => {
      const input = createValidInput();
      const result = await handler.execute(input);
      const output = result.outputPayload as any;

      // Schema requires these base fields
      expect(output.schema_version).toBe('1.0.0');
      expect(output.biz_ref_id).toBe('req-1');
      expect(output.confidence).toBeGreaterThanOrEqual(0);
      expect(output.confidence).toBeLessThanOrEqual(1);
      expect(output.reason).toBeDefined();
      expect(output.reason.length).toBeGreaterThan(0);
    });

    it('should handle tasks without required_skills', async () => {
      const input = createValidInput({
        tasks: [
          {
            task_key: 'T1',
            title: 'General task',
            estimated_hours: 4,
          },
        ],
      });

      const result = await handler.execute(input);
      const output = result.outputPayload as any;

      expect(output.suggestions).toHaveLength(1);
      expect(output.suggestions[0].recommended_owner_id).toBeDefined();
      expect(output.suggestions[0].confidence).toBeGreaterThan(0);
    });

    it('should prefer members with lower workload when skills are equal', async () => {
      const input: AssignmentSuggestInput = {
        tasks: [
          {
            task_key: 'T1',
            title: 'Generic task',
            estimated_hours: 8,
            required_skills: ['JavaScript'],
          },
        ],
        members: [
          {
            member_id: '201',
            name: 'HighLoad',
            skills: ['JavaScript'],
            workload: 38,
            availability: 40,
            historical_success_rate: 0.9,
          },
          {
            member_id: '202',
            name: 'LowLoad',
            skills: ['JavaScript'],
            workload: 10,
            availability: 40,
            historical_success_rate: 0.9,
          },
        ],
        biz_ref_id: 'req-2',
      };

      const result = await handler.execute(input);
      const output = result.outputPayload as any;

      // LowLoad has more remaining capacity
      expect(output.suggestions[0].recommended_owner_id).toBe('202');
    });

    it('should return rawResponse as valid JSON string', async () => {
      const input = createValidInput();
      const result = await handler.execute(input);

      expect(result.rawResponse).toBeDefined();
      const parsed = JSON.parse(result.rawResponse!);
      expect(parsed.suggestions).toBeDefined();
    });

    it('should handle single member scenario', async () => {
      const input: AssignmentSuggestInput = {
        tasks: [{ task_key: 'T1', title: 'Task 1' }],
        members: [
          {
            member_id: '301',
            name: 'Solo',
            skills: ['TypeScript'],
            workload: 10,
            availability: 40,
            historical_success_rate: 0.8,
          },
        ],
        biz_ref_id: 'req-3',
      };

      const result = await handler.execute(input);
      const output = result.outputPayload as any;

      expect(output.suggestions).toHaveLength(1);
      expect(output.suggestions[0].recommended_owner_id).toBe('301');
      expect(output.suggestions[0].alternatives).toHaveLength(0);
    });
  });

  describe('buildAssignmentSuggestPrompt', () => {
    it('should include prompt version in the prompt', () => {
      const input = createValidInput();
      const prompt = buildAssignmentSuggestPrompt(input);

      expect(prompt).toContain('Prompt Version: 1.0.0');
      expect(prompt).toContain('Template: assignment_suggest_v1');
    });

    it('should include task information in the prompt', () => {
      const input = createValidInput();
      const prompt = buildAssignmentSuggestPrompt(input);

      expect(prompt).toContain('T1');
      expect(prompt).toContain('Implement login page');
      expect(prompt).toContain('React');
      expect(prompt).toContain('TypeScript');
    });

    it('should include member profile information in the prompt', () => {
      const input = createValidInput();
      const prompt = buildAssignmentSuggestPrompt(input);

      expect(prompt).toContain('Alice');
      expect(prompt).toContain('Bob');
      expect(prompt).toContain('Workload: 20h');
      expect(prompt).toContain('Availability: 40h');
      expect(prompt).toContain('Success Rate: 90%');
    });
  });
});
