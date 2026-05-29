import { z, ZodSchema, ZodError } from 'zod';
import { ParseError, BusinessValidationError } from './errors';

/**
 * Base schema that all AI outputs must conform to.
 * Every AI response must include:
 * - schema_version: version of the output schema for forward compatibility
 * - biz_ref_id: business key reference (e.g., requirement_id, task_id)
 * - confidence: a confidence score between 0 and 1
 * - reason: explanation of the AI's reasoning
 */
export const AiOutputBaseSchema = z.object({
  schema_version: z.string().min(1, 'schema_version is required'),
  biz_ref_id: z.string().min(1, 'biz_ref_id is required'),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1, 'reason is required'),
});

export type AiOutputBase = z.infer<typeof AiOutputBaseSchema>;

/**
 * Schema for task decomposition output.
 */
export const TaskDecompositionOutputSchema = AiOutputBaseSchema.extend({
  tasks: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      estimated_hours: z.number().positive(),
      dependencies: z.array(z.string()).default([]),
      acceptance_criteria: z.string().optional(),
      parent_key: z.string().optional(),
      task_key: z.string().min(1),
    }),
  ),
});

export type TaskDecompositionOutput = z.infer<
  typeof TaskDecompositionOutputSchema
>;

/**
 * Schema for assignment suggestion output.
 */
export const AssignmentSuggestionOutputSchema = AiOutputBaseSchema.extend({
  suggestions: z.array(
    z.object({
      task_key: z.string().min(1),
      recommended_owner_id: z.string().min(1),
      reason: z.string().min(1),
      confidence: z.number().min(0).max(1),
      alternatives: z
        .array(
          z.object({
            owner_id: z.string().min(1),
            reason: z.string().min(1),
          }),
        )
        .default([]),
    }),
  ),
});

export type AssignmentSuggestionOutput = z.infer<
  typeof AssignmentSuggestionOutputSchema
>;

/**
 * Schema for report generation output.
 */
export const ReportGenerationOutputSchema = AiOutputBaseSchema.extend({
  title: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().min(1),
  risk_summary: z.string().optional(),
});

export type ReportGenerationOutput = z.infer<
  typeof ReportGenerationOutputSchema
>;

/**
 * Validates a raw AI response string against a Zod schema.
 *
 * Steps:
 * 1. Parse the raw string as JSON (throws ParseError if invalid JSON)
 * 2. Validate the parsed object against the provided Zod schema (throws ParseError if schema mismatch)
 * 3. Return the typed, validated result
 *
 * @param rawResponse - The raw string response from the AI model
 * @param schema - The Zod schema to validate against
 * @returns The validated and typed result
 * @throws ParseError if JSON parsing fails or schema validation fails
 */
export function validateAiOutput<T>(rawResponse: string, schema: ZodSchema<T>): T {
  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResponse);
  } catch (e) {
    throw new ParseError(
      `Failed to parse AI response as JSON: ${e instanceof Error ? e.message : String(e)}`,
      rawResponse,
    );
  }

  // Step 2: Validate against Zod schema
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const errorDetails = formatZodError(result.error);
    throw new ParseError(
      `AI output schema validation failed: ${errorDetails}`,
      rawResponse,
    );
  }

  return result.data;
}

/**
 * Validates a pre-parsed object against a Zod schema.
 * Use this when you already have a parsed object (not a raw string).
 *
 * @param data - The parsed data object
 * @param schema - The Zod schema to validate against
 * @param rawResponse - Optional raw response string for error context
 * @returns The validated and typed result
 * @throws ParseError if schema validation fails
 */
export function validateParsedOutput<T>(
  data: unknown,
  schema: ZodSchema<T>,
  rawResponse?: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorDetails = formatZodError(result.error);
    throw new ParseError(
      `AI output schema validation failed: ${errorDetails}`,
      rawResponse,
    );
  }

  return result.data;
}

/**
 * Performs business-level validation on a validated AI output.
 * This is for domain-specific checks that go beyond schema structure.
 *
 * @param data - The schema-validated data
 * @param validator - A function that returns an error message if validation fails, or null if valid
 * @param rawResponse - The raw response string for error context
 * @returns The validated data (pass-through if valid)
 * @throws BusinessValidationError if the business validator returns an error
 */
export function validateBusinessRules<T>(
  data: T,
  validator: (data: T) => string | null,
  rawResponse?: string,
): T {
  const error = validator(data);
  if (error) {
    throw new BusinessValidationError(error, rawResponse);
  }
  return data;
}

/**
 * Formats a ZodError into a human-readable string.
 */
function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
