import { z, ZodSchema } from 'zod';
export declare const AiOutputBaseSchema: z.ZodObject<{
    schema_version: z.ZodString;
    biz_ref_id: z.ZodString;
    confidence: z.ZodNumber;
    reason: z.ZodString;
}, z.core.$strip>;
export type AiOutputBase = z.infer<typeof AiOutputBaseSchema>;
export declare const TaskDecompositionOutputSchema: z.ZodObject<{
    schema_version: z.ZodString;
    biz_ref_id: z.ZodString;
    confidence: z.ZodNumber;
    reason: z.ZodString;
    tasks: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        estimated_hours: z.ZodNumber;
        dependencies: z.ZodDefault<z.ZodArray<z.ZodString>>;
        acceptance_criteria: z.ZodOptional<z.ZodString>;
        parent_key: z.ZodOptional<z.ZodString>;
        task_key: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type TaskDecompositionOutput = z.infer<typeof TaskDecompositionOutputSchema>;
export declare const AssignmentSuggestionOutputSchema: z.ZodObject<{
    schema_version: z.ZodString;
    biz_ref_id: z.ZodString;
    confidence: z.ZodNumber;
    reason: z.ZodString;
    suggestions: z.ZodArray<z.ZodObject<{
        task_key: z.ZodString;
        recommended_owner_id: z.ZodString;
        reason: z.ZodString;
        confidence: z.ZodNumber;
        alternatives: z.ZodDefault<z.ZodArray<z.ZodObject<{
            owner_id: z.ZodString;
            reason: z.ZodString;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type AssignmentSuggestionOutput = z.infer<typeof AssignmentSuggestionOutputSchema>;
export declare const ReportGenerationOutputSchema: z.ZodObject<{
    schema_version: z.ZodString;
    biz_ref_id: z.ZodString;
    confidence: z.ZodNumber;
    reason: z.ZodString;
    title: z.ZodString;
    summary: z.ZodString;
    content: z.ZodString;
    risk_summary: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ReportGenerationOutput = z.infer<typeof ReportGenerationOutputSchema>;
export declare function validateAiOutput<T>(rawResponse: string, schema: ZodSchema<T>): T;
export declare function validateParsedOutput<T>(data: unknown, schema: ZodSchema<T>, rawResponse?: string): T;
export declare function validateBusinessRules<T>(data: T, validator: (data: T) => string | null, rawResponse?: string): T;
