import { z } from 'zod';
import {
  validateAiOutput,
  validateParsedOutput,
  validateBusinessRules,
  AiOutputBaseSchema,
  TaskDecompositionOutputSchema,
  AssignmentSuggestionOutputSchema,
  ReportGenerationOutputSchema,
} from './output-validator';
import { ParseError, BusinessValidationError } from './errors';

describe('validateAiOutput', () => {
  const validBaseOutput = {
    schema_version: '1.0.0',
    biz_ref_id: 'req-123',
    confidence: 0.85,
    reason: 'Based on requirement analysis',
  };

  describe('JSON parsing', () => {
    it('should throw ParseError for invalid JSON', () => {
      expect(() =>
        validateAiOutput('not valid json', AiOutputBaseSchema),
      ).toThrow(ParseError);
    });

    it('should preserve raw response in ParseError for invalid JSON', () => {
      const rawResponse = '{broken json';
      try {
        validateAiOutput(rawResponse, AiOutputBaseSchema);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        expect((error as ParseError).rawResponse).toBe(rawResponse);
      }
    });

    it('should parse valid JSON successfully', () => {
      const result = validateAiOutput(
        JSON.stringify(validBaseOutput),
        AiOutputBaseSchema,
      );
      expect(result).toEqual(validBaseOutput);
    });
  });

  describe('schema validation', () => {
    it('should throw ParseError when schema validation fails', () => {
      const invalidOutput = { schema_version: '1.0.0' }; // missing fields
      expect(() =>
        validateAiOutput(JSON.stringify(invalidOutput), AiOutputBaseSchema),
      ).toThrow(ParseError);
    });

    it('should include field path in ParseError message', () => {
      const invalidOutput = {
        schema_version: '1.0.0',
        biz_ref_id: 'req-123',
        confidence: 2.0, // invalid: > 1
        reason: 'test',
      };
      try {
        validateAiOutput(JSON.stringify(invalidOutput), AiOutputBaseSchema);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        expect((error as ParseError).message).toContain('confidence');
      }
    });

    it('should preserve raw response in ParseError for schema failure', () => {
      const rawResponse = JSON.stringify({ schema_version: '' });
      try {
        validateAiOutput(rawResponse, AiOutputBaseSchema);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        expect((error as ParseError).rawResponse).toBe(rawResponse);
      }
    });
  });

  describe('AiOutputBaseSchema', () => {
    it('should validate a correct base output', () => {
      const result = validateAiOutput(
        JSON.stringify(validBaseOutput),
        AiOutputBaseSchema,
      );
      expect(result.schema_version).toBe('1.0.0');
      expect(result.biz_ref_id).toBe('req-123');
      expect(result.confidence).toBe(0.85);
      expect(result.reason).toBe('Based on requirement analysis');
    });

    it('should reject empty schema_version', () => {
      const output = { ...validBaseOutput, schema_version: '' };
      expect(() =>
        validateAiOutput(JSON.stringify(output), AiOutputBaseSchema),
      ).toThrow(ParseError);
    });

    it('should reject confidence below 0', () => {
      const output = { ...validBaseOutput, confidence: -0.1 };
      expect(() =>
        validateAiOutput(JSON.stringify(output), AiOutputBaseSchema),
      ).toThrow(ParseError);
    });

    it('should reject confidence above 1', () => {
      const output = { ...validBaseOutput, confidence: 1.1 };
      expect(() =>
        validateAiOutput(JSON.stringify(output), AiOutputBaseSchema),
      ).toThrow(ParseError);
    });

    it('should accept confidence at boundaries (0 and 1)', () => {
      expect(() =>
        validateAiOutput(
          JSON.stringify({ ...validBaseOutput, confidence: 0 }),
          AiOutputBaseSchema,
        ),
      ).not.toThrow();
      expect(() =>
        validateAiOutput(
          JSON.stringify({ ...validBaseOutput, confidence: 1 }),
          AiOutputBaseSchema,
        ),
      ).not.toThrow();
    });
  });

  describe('TaskDecompositionOutputSchema', () => {
    it('should validate a correct task decomposition output', () => {
      const output = {
        ...validBaseOutput,
        tasks: [
          {
            title: 'Setup database',
            description: 'Create tables',
            estimated_hours: 4,
            dependencies: [],
            acceptance_criteria: 'Tables exist',
            task_key: 'task-1',
          },
          {
            title: 'Implement API',
            estimated_hours: 8,
            dependencies: ['task-1'],
            task_key: 'task-2',
            parent_key: 'task-1',
          },
        ],
      };

      const result = validateAiOutput(
        JSON.stringify(output),
        TaskDecompositionOutputSchema,
      );
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].title).toBe('Setup database');
      expect(result.tasks[1].dependencies).toEqual(['task-1']);
    });

    it('should reject tasks with missing required fields', () => {
      const output = {
        ...validBaseOutput,
        tasks: [{ title: 'Missing fields' }],
      };
      expect(() =>
        validateAiOutput(
          JSON.stringify(output),
          TaskDecompositionOutputSchema,
        ),
      ).toThrow(ParseError);
    });
  });

  describe('AssignmentSuggestionOutputSchema', () => {
    it('should validate a correct assignment suggestion output', () => {
      const output = {
        ...validBaseOutput,
        suggestions: [
          {
            task_key: 'task-1',
            recommended_owner_id: 'user-42',
            reason: 'Best skill match',
            confidence: 0.9,
            alternatives: [
              { owner_id: 'user-43', reason: 'Second best' },
            ],
          },
        ],
      };

      const result = validateAiOutput(
        JSON.stringify(output),
        AssignmentSuggestionOutputSchema,
      );
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].recommended_owner_id).toBe('user-42');
    });
  });

  describe('ReportGenerationOutputSchema', () => {
    it('should validate a correct report generation output', () => {
      const output = {
        ...validBaseOutput,
        title: 'Weekly Report',
        summary: 'Team made good progress',
        content: 'Detailed content here...',
        risk_summary: 'No major risks',
      };

      const result = validateAiOutput(
        JSON.stringify(output),
        ReportGenerationOutputSchema,
      );
      expect(result.title).toBe('Weekly Report');
      expect(result.summary).toBe('Team made good progress');
    });

    it('should allow optional risk_summary', () => {
      const output = {
        ...validBaseOutput,
        title: 'Daily Report',
        summary: 'Summary',
        content: 'Content',
      };

      const result = validateAiOutput(
        JSON.stringify(output),
        ReportGenerationOutputSchema,
      );
      expect(result.risk_summary).toBeUndefined();
    });
  });
});

describe('validateParsedOutput', () => {
  it('should validate a pre-parsed object', () => {
    const data = {
      schema_version: '1.0.0',
      biz_ref_id: 'req-1',
      confidence: 0.5,
      reason: 'test',
    };

    const result = validateParsedOutput(data, AiOutputBaseSchema);
    expect(result).toEqual(data);
  });

  it('should throw ParseError for invalid pre-parsed object', () => {
    const data = { schema_version: '' };
    expect(() => validateParsedOutput(data, AiOutputBaseSchema)).toThrow(
      ParseError,
    );
  });

  it('should include raw response in error when provided', () => {
    const rawResponse = 'original raw text';
    try {
      validateParsedOutput({}, AiOutputBaseSchema, rawResponse);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ParseError);
      expect((error as ParseError).rawResponse).toBe(rawResponse);
    }
  });
});

describe('validateBusinessRules', () => {
  it('should pass through data when validator returns null', () => {
    const data = { value: 42 };
    const result = validateBusinessRules(data, () => null);
    expect(result).toBe(data);
  });

  it('should throw BusinessValidationError when validator returns error', () => {
    const data = { value: -1 };
    expect(() =>
      validateBusinessRules(data, (d) =>
        d.value < 0 ? 'Value must be positive' : null,
      ),
    ).toThrow(BusinessValidationError);
  });

  it('should preserve raw response in BusinessValidationError', () => {
    const rawResponse = '{"value": -1}';
    try {
      validateBusinessRules(
        { value: -1 },
        () => 'Business rule violated',
        rawResponse,
      );
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessValidationError);
      expect((error as BusinessValidationError).rawResponse).toBe(rawResponse);
    }
  });
});
