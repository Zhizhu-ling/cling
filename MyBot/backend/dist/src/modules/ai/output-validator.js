"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerationOutputSchema = exports.AssignmentSuggestionOutputSchema = exports.TaskDecompositionOutputSchema = exports.AiOutputBaseSchema = void 0;
exports.validateAiOutput = validateAiOutput;
exports.validateParsedOutput = validateParsedOutput;
exports.validateBusinessRules = validateBusinessRules;
const zod_1 = require("zod");
const errors_1 = require("./errors");
exports.AiOutputBaseSchema = zod_1.z.object({
    schema_version: zod_1.z.string().min(1, 'schema_version is required'),
    biz_ref_id: zod_1.z.string().min(1, 'biz_ref_id is required'),
    confidence: zod_1.z.number().min(0).max(1),
    reason: zod_1.z.string().min(1, 'reason is required'),
});
exports.TaskDecompositionOutputSchema = exports.AiOutputBaseSchema.extend({
    tasks: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string().min(1),
        description: zod_1.z.string().optional(),
        estimated_hours: zod_1.z.number().positive(),
        dependencies: zod_1.z.array(zod_1.z.string()).default([]),
        acceptance_criteria: zod_1.z.string().optional(),
        parent_key: zod_1.z.string().optional(),
        task_key: zod_1.z.string().min(1),
    })),
});
exports.AssignmentSuggestionOutputSchema = exports.AiOutputBaseSchema.extend({
    suggestions: zod_1.z.array(zod_1.z.object({
        task_key: zod_1.z.string().min(1),
        recommended_owner_id: zod_1.z.string().min(1),
        reason: zod_1.z.string().min(1),
        confidence: zod_1.z.number().min(0).max(1),
        alternatives: zod_1.z
            .array(zod_1.z.object({
            owner_id: zod_1.z.string().min(1),
            reason: zod_1.z.string().min(1),
        }))
            .default([]),
    })),
});
exports.ReportGenerationOutputSchema = exports.AiOutputBaseSchema.extend({
    title: zod_1.z.string().min(1),
    summary: zod_1.z.string().min(1),
    content: zod_1.z.string().min(1),
    risk_summary: zod_1.z.string().optional(),
});
function validateAiOutput(rawResponse, schema) {
    let parsed;
    try {
        parsed = JSON.parse(rawResponse);
    }
    catch (e) {
        throw new errors_1.ParseError(`Failed to parse AI response as JSON: ${e instanceof Error ? e.message : String(e)}`, rawResponse);
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
        const errorDetails = formatZodError(result.error);
        throw new errors_1.ParseError(`AI output schema validation failed: ${errorDetails}`, rawResponse);
    }
    return result.data;
}
function validateParsedOutput(data, schema, rawResponse) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errorDetails = formatZodError(result.error);
        throw new errors_1.ParseError(`AI output schema validation failed: ${errorDetails}`, rawResponse);
    }
    return result.data;
}
function validateBusinessRules(data, validator, rawResponse) {
    const error = validator(data);
    if (error) {
        throw new errors_1.BusinessValidationError(error, rawResponse);
    }
    return data;
}
function formatZodError(error) {
    return error.issues
        .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
        return `${path}: ${issue.message}`;
    })
        .join('; ');
}
//# sourceMappingURL=output-validator.js.map