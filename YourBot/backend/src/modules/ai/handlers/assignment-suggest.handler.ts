import { Logger } from '@nestjs/common';
import { AiJobHandler, AiJobHandlerResult } from '../interfaces';
import {
  AssignmentSuggestionOutputSchema,
  validateParsedOutput,
  validateAiOutput,
} from '../output-validator';
import { getPromptVersionConfig } from '../config';
import { AiJobType } from '../../../domain/enums';
import { AiClient } from '../ai-client';

/**
 * Input payload structure for assignment suggestion jobs.
 */
export interface AssignmentSuggestInput {
  /** Array of tasks to suggest assignments for */
  tasks: Array<{
    task_key: string;
    title: string;
    description?: string;
    estimated_hours?: number;
    required_skills?: string[];
    priority?: number;
  }>;

  /** Array of member profiles to consider for assignment */
  members: Array<{
    member_id: string;
    name: string;
    skills: string[];
    workload: number;
    availability: number;
    historical_success_rate: number;
  }>;

  /** Business reference ID (e.g., requirement_id) */
  biz_ref_id?: string;
}

/**
 * Builds the prompt template for assignment suggestions.
 * Includes prompt_version for traceability.
 */
export function buildAssignmentSuggestPrompt(input: AssignmentSuggestInput): string {
  const versionConfig = getPromptVersionConfig(AiJobType.ASSIGNMENT_SUGGEST);

  const tasksDescription = input.tasks
    .map(
      (t) =>
        `- [${t.task_key}] "${t.title}"${t.description ? ` - ${t.description}` : ''}` +
        `${t.estimated_hours ? ` (${t.estimated_hours}h)` : ''}` +
        `${t.required_skills?.length ? ` Skills: ${t.required_skills.join(', ')}` : ''}` +
        `${t.priority ? ` Priority: ${t.priority}` : ''}`,
    )
    .join('\n');

  const membersDescription = input.members
    .map(
      (m) =>
        `- [${m.member_id}] ${m.name}` +
        ` | Skills: ${m.skills.join(', ')}` +
        ` | Workload: ${m.workload}h` +
        ` | Availability: ${m.availability}h` +
        ` | Success Rate: ${(m.historical_success_rate * 100).toFixed(0)}%`,
    )
    .join('\n');

  return `[Prompt Version: ${versionConfig.promptVersion}] [Template: ${versionConfig.templateName}]

You are a task assignment optimization assistant. Analyze the following tasks and team member profiles to recommend the best assignee for each task.

## Tasks to Assign:
${tasksDescription}

## Available Team Members:
${membersDescription}

## Assignment Criteria:
1. Skill match: Member's skills should align with task requirements
2. Workload balance: Prefer members with lower current workload relative to availability
3. Availability: Member must have sufficient available hours for the estimated task duration
4. Historical performance: Higher success rate indicates more reliable delivery

## Output Requirements:
For each task, provide:
- The recommended assignee (member_id)
- A clear reason explaining why this member is the best fit
- A confidence score (0-1) based on how well the member matches
- Alternative assignees (if available) with reasons

Respond in JSON format matching the schema version ${versionConfig.schemaVersion}.`;
}

/**
 * Simulates AI response for assignment suggestions (MVP placeholder).
 * In production, this would call the actual LLM API.
 *
 * The simulation uses a scoring algorithm that considers:
 * - Skill overlap between task requirements and member skills
 * - Workload vs availability ratio
 * - Historical success rate
 */
function simulateAssignmentSuggestions(
  input: AssignmentSuggestInput,
): Record<string, any> {
  const versionConfig = getPromptVersionConfig(AiJobType.ASSIGNMENT_SUGGEST);

  const suggestions = input.tasks.map((task) => {
    // Score each member for this task
    const scoredMembers = input.members
      .map((member) => {
        let score = 0;

        // Skill match scoring (0-0.4)
        if (task.required_skills && task.required_skills.length > 0) {
          const matchingSkills = task.required_skills.filter((skill) =>
            member.skills.some(
              (ms) => ms.toLowerCase() === skill.toLowerCase(),
            ),
          );
          score += (matchingSkills.length / task.required_skills.length) * 0.4;
        } else {
          // No specific skills required, give partial credit
          score += 0.2;
        }

        // Availability scoring (0-0.3)
        const remainingCapacity = member.availability - member.workload;
        const taskHours = task.estimated_hours ?? 8;
        if (remainingCapacity >= taskHours) {
          score += 0.3;
        } else if (remainingCapacity > 0) {
          score += (remainingCapacity / taskHours) * 0.3;
        }

        // Historical success rate scoring (0-0.3)
        score += member.historical_success_rate * 0.3;

        return {
          member,
          score: Math.min(score, 1),
          reason: buildMemberReason(member, task, score),
        };
      })
      .sort((a, b) => b.score - a.score);

    const topMember = scoredMembers[0];
    const alternatives = scoredMembers.slice(1, 3).map((sm) => ({
      owner_id: sm.member.member_id,
      reason: sm.reason,
    }));

    return {
      task_key: task.task_key,
      recommended_owner_id: topMember?.member.member_id ?? 'unassigned',
      reason: topMember?.reason ?? 'No suitable member found',
      confidence: topMember ? Math.round(topMember.score * 100) / 100 : 0,
      alternatives,
    };
  });

  return {
    schema_version: versionConfig.schemaVersion,
    biz_ref_id: input.biz_ref_id ?? 'unknown',
    confidence: suggestions.length > 0
      ? Math.round(
          (suggestions.reduce((sum, s) => sum + s.confidence, 0) /
            suggestions.length) *
            100,
        ) / 100
      : 0,
    reason: `Assignment suggestions generated for ${suggestions.length} task(s) based on skill match, workload balance, availability, and historical performance.`,
    suggestions,
  };
}

/**
 * Builds a human-readable reason for why a member is recommended for a task.
 */
function buildMemberReason(
  member: AssignmentSuggestInput['members'][0],
  task: AssignmentSuggestInput['tasks'][0],
  score: number,
): string {
  const reasons: string[] = [];

  // Skill match
  if (task.required_skills && task.required_skills.length > 0) {
    const matchingSkills = task.required_skills.filter((skill) =>
      member.skills.some((ms) => ms.toLowerCase() === skill.toLowerCase()),
    );
    if (matchingSkills.length > 0) {
      reasons.push(`Matches ${matchingSkills.length}/${task.required_skills.length} required skills (${matchingSkills.join(', ')})`);
    } else {
      reasons.push('No direct skill match');
    }
  }

  // Availability
  const remainingCapacity = member.availability - member.workload;
  const taskHours = task.estimated_hours ?? 8;
  if (remainingCapacity >= taskHours) {
    reasons.push(`Has sufficient capacity (${remainingCapacity}h available)`);
  } else {
    reasons.push(`Limited capacity (${remainingCapacity}h available, task needs ${taskHours}h)`);
  }

  // Success rate
  reasons.push(`Historical success rate: ${(member.historical_success_rate * 100).toFixed(0)}%`);

  return reasons.join('. ') + `.`;
}

/**
 * AI Job Handler for assignment suggestions.
 *
 * Analyzes member profiles (skills, workload, availability, historical_success_rate)
 * and returns ranked recommendations with ai_reason for each suggestion.
 *
 * For MVP: uses a simulated scoring algorithm instead of actual LLM calls.
 * The output is validated against AssignmentSuggestionOutputSchema.
 *
 * Validates: Requirements 4.1, 4.2, 4.3
 */
export class AssignmentSuggestHandler implements AiJobHandler {
  private readonly logger = new Logger(AssignmentSuggestHandler.name);

  constructor(private readonly aiClient?: AiClient) {}

  async execute(inputPayload: Record<string, any>): Promise<AiJobHandlerResult> {
    this.logger.log('Executing assignment suggestion handler');

    const input = inputPayload as AssignmentSuggestInput;

    // Build the prompt
    const prompt = buildAssignmentSuggestPrompt(input);
    this.logger.debug(`Built prompt (${prompt.length} chars)`);

    let rawOutput: Record<string, any>;
    let rawResponse: string;

    // Try real AI call, fall back to simulation
    if (this.aiClient) {
      try {
        rawResponse = await this.aiClient.chat(prompt, '你是一个任务分配优化AI助手。请严格按照用户要求的JSON格式返回结果，不要添加任何额外文字。');
        rawOutput = JSON.parse(rawResponse);
        this.logger.log('使用真实 AI 模型生成分配建议');

        // Validate - if fails, fall back to simulation
        try {
          validateParsedOutput(rawOutput, AssignmentSuggestionOutputSchema, rawResponse);
        } catch (validationError: any) {
          this.logger.warn(`AI 返回格式验证失败，回退到模拟数据: ${validationError.message}`);
          rawOutput = simulateAssignmentSuggestions(input);
          rawResponse = JSON.stringify(rawOutput, null, 2);
        }
      } catch (error: any) {
        this.logger.warn(`AI 调用失败，回退到模拟数据: ${error.message}`);
        rawOutput = simulateAssignmentSuggestions(input);
        rawResponse = JSON.stringify(rawOutput, null, 2);
      }
    } else {
      rawOutput = simulateAssignmentSuggestions(input);
      rawResponse = JSON.stringify(rawOutput, null, 2);
    }

    // Validate output against Zod schema
    const validatedOutput = validateParsedOutput(
      rawOutput,
      AssignmentSuggestionOutputSchema,
      rawResponse,
    );

    this.logger.log(
      `Assignment suggestions generated: ${(validatedOutput as any).suggestions.length} suggestion(s)`,
    );

    return {
      outputPayload: validatedOutput as unknown as Record<string, any>,
      rawResponse,
    };
  }
}
