"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentSuggestHandler = void 0;
exports.buildAssignmentSuggestPrompt = buildAssignmentSuggestPrompt;
const common_1 = require("@nestjs/common");
const output_validator_1 = require("../output-validator");
const config_1 = require("../config");
const enums_1 = require("../../../domain/enums");
function buildAssignmentSuggestPrompt(input) {
    const versionConfig = (0, config_1.getPromptVersionConfig)(enums_1.AiJobType.ASSIGNMENT_SUGGEST);
    const tasksDescription = input.tasks
        .map((t) => `- [${t.task_key}] "${t.title}"${t.description ? ` - ${t.description}` : ''}` +
        `${t.estimated_hours ? ` (${t.estimated_hours}h)` : ''}` +
        `${t.required_skills?.length ? ` Skills: ${t.required_skills.join(', ')}` : ''}` +
        `${t.priority ? ` Priority: ${t.priority}` : ''}`)
        .join('\n');
    const membersDescription = input.members
        .map((m) => `- [${m.member_id}] ${m.name}` +
        ` | Skills: ${m.skills.join(', ')}` +
        ` | Workload: ${m.workload}h` +
        ` | Availability: ${m.availability}h` +
        ` | Success Rate: ${(m.historical_success_rate * 100).toFixed(0)}%`)
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
function simulateAssignmentSuggestions(input) {
    const versionConfig = (0, config_1.getPromptVersionConfig)(enums_1.AiJobType.ASSIGNMENT_SUGGEST);
    const suggestions = input.tasks.map((task) => {
        const scoredMembers = input.members
            .map((member) => {
            let score = 0;
            if (task.required_skills && task.required_skills.length > 0) {
                const matchingSkills = task.required_skills.filter((skill) => member.skills.some((ms) => ms.toLowerCase() === skill.toLowerCase()));
                score += (matchingSkills.length / task.required_skills.length) * 0.4;
            }
            else {
                score += 0.2;
            }
            const remainingCapacity = member.availability - member.workload;
            const taskHours = task.estimated_hours ?? 8;
            if (remainingCapacity >= taskHours) {
                score += 0.3;
            }
            else if (remainingCapacity > 0) {
                score += (remainingCapacity / taskHours) * 0.3;
            }
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
            ? Math.round((suggestions.reduce((sum, s) => sum + s.confidence, 0) /
                suggestions.length) *
                100) / 100
            : 0,
        reason: `Assignment suggestions generated for ${suggestions.length} task(s) based on skill match, workload balance, availability, and historical performance.`,
        suggestions,
    };
}
function buildMemberReason(member, task, score) {
    const reasons = [];
    if (task.required_skills && task.required_skills.length > 0) {
        const matchingSkills = task.required_skills.filter((skill) => member.skills.some((ms) => ms.toLowerCase() === skill.toLowerCase()));
        if (matchingSkills.length > 0) {
            reasons.push(`Matches ${matchingSkills.length}/${task.required_skills.length} required skills (${matchingSkills.join(', ')})`);
        }
        else {
            reasons.push('No direct skill match');
        }
    }
    const remainingCapacity = member.availability - member.workload;
    const taskHours = task.estimated_hours ?? 8;
    if (remainingCapacity >= taskHours) {
        reasons.push(`Has sufficient capacity (${remainingCapacity}h available)`);
    }
    else {
        reasons.push(`Limited capacity (${remainingCapacity}h available, task needs ${taskHours}h)`);
    }
    reasons.push(`Historical success rate: ${(member.historical_success_rate * 100).toFixed(0)}%`);
    return reasons.join('. ') + `.`;
}
class AssignmentSuggestHandler {
    aiClient;
    logger = new common_1.Logger(AssignmentSuggestHandler.name);
    constructor(aiClient) {
        this.aiClient = aiClient;
    }
    async execute(inputPayload) {
        this.logger.log('Executing assignment suggestion handler');
        const input = inputPayload;
        const prompt = buildAssignmentSuggestPrompt(input);
        this.logger.debug(`Built prompt (${prompt.length} chars)`);
        let rawOutput;
        let rawResponse;
        if (this.aiClient) {
            try {
                rawResponse = await this.aiClient.chat(prompt, '你是一个任务分配优化AI助手。请严格按照用户要求的JSON格式返回结果，不要添加任何额外文字。');
                rawOutput = JSON.parse(rawResponse);
                this.logger.log('使用真实 AI 模型生成分配建议');
                try {
                    (0, output_validator_1.validateParsedOutput)(rawOutput, output_validator_1.AssignmentSuggestionOutputSchema, rawResponse);
                }
                catch (validationError) {
                    this.logger.warn(`AI 返回格式验证失败，回退到模拟数据: ${validationError.message}`);
                    rawOutput = simulateAssignmentSuggestions(input);
                    rawResponse = JSON.stringify(rawOutput, null, 2);
                }
            }
            catch (error) {
                this.logger.warn(`AI 调用失败，回退到模拟数据: ${error.message}`);
                rawOutput = simulateAssignmentSuggestions(input);
                rawResponse = JSON.stringify(rawOutput, null, 2);
            }
        }
        else {
            rawOutput = simulateAssignmentSuggestions(input);
            rawResponse = JSON.stringify(rawOutput, null, 2);
        }
        const validatedOutput = (0, output_validator_1.validateParsedOutput)(rawOutput, output_validator_1.AssignmentSuggestionOutputSchema, rawResponse);
        this.logger.log(`Assignment suggestions generated: ${validatedOutput.suggestions.length} suggestion(s)`);
        return {
            outputPayload: validatedOutput,
            rawResponse,
        };
    }
}
exports.AssignmentSuggestHandler = AssignmentSuggestHandler;
//# sourceMappingURL=assignment-suggest.handler.js.map