"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerateHandler = void 0;
exports.buildReportPrompt = buildReportPrompt;
exports.generateMockReportResponse = generateMockReportResponse;
const common_1 = require("@nestjs/common");
const output_validator_1 = require("../output-validator");
const config_1 = require("../config");
const enums_1 = require("../../../domain/enums");
function buildReportPrompt(input) {
    const versionConfig = (0, config_1.getPromptVersionConfig)(enums_1.AiJobType.REPORT_GENERATE);
    const reportTypeLabels = {
        daily: '日报 (Daily Report)',
        weekly: '周报 (Weekly Report)',
        stage: '阶段报告 (Stage Report)',
    };
    const reportTypeLabel = reportTypeLabels[input.report_type] || input.report_type;
    let prompt = `[Prompt Version: ${versionConfig.promptVersion}] [Template: ${versionConfig.templateName}]

You are a project management AI assistant. Generate a structured management report.

## Report Parameters
- Report Type: ${reportTypeLabel}
- Date Range: ${input.date_from} to ${input.date_to}
`;
    if (input.project_context) {
        prompt += `
## Project Context
- Project: ${input.project_context.project_name ?? 'N/A'}
- Team Size: ${input.project_context.team_size ?? 'N/A'}
`;
    }
    if (input.task_data) {
        prompt += `
## Task Summary
- Total Tasks: ${input.task_data.total_tasks ?? 0}
- Completed: ${input.task_data.completed_tasks ?? 0}
- In Progress: ${input.task_data.in_progress_tasks ?? 0}
- Blocked: ${input.task_data.blocked_tasks ?? 0}
- Delayed: ${input.task_data.delayed_tasks ?? 0}
`;
    }
    if (input.team_data?.members && input.team_data.members.length > 0) {
        prompt += `
## Team Performance
`;
        for (const member of input.team_data.members) {
            prompt += `- ${member.name}: Completed ${member.completed_count ?? 0}, In Progress ${member.in_progress_count ?? 0}\n`;
        }
    }
    prompt += `
## Output Requirements
Generate a JSON object with the following fields:
- schema_version: "${versionConfig.schemaVersion}"
- biz_ref_id: A reference identifier for this report
- confidence: A confidence score between 0 and 1
- reason: Brief explanation of the report generation approach
- title: A concise report title
- summary: Executive summary (2-3 sentences)
- content: Detailed report content in Markdown format
- risk_summary: (optional) Summary of identified risks and mitigation suggestions

Respond ONLY with valid JSON.
`;
    return prompt;
}
function generateMockReportResponse(input) {
    const versionConfig = (0, config_1.getPromptVersionConfig)(enums_1.AiJobType.REPORT_GENERATE);
    const reportTypeLabels = {
        daily: '日报',
        weekly: '周报',
        stage: '阶段报告',
    };
    const reportTypeLabel = reportTypeLabels[input.report_type] || input.report_type;
    const totalTasks = input.task_data?.total_tasks ?? 0;
    const completedTasks = input.task_data?.completed_tasks ?? 0;
    const blockedTasks = input.task_data?.blocked_tasks ?? 0;
    const delayedTasks = input.task_data?.delayed_tasks ?? 0;
    const inProgressTasks = input.task_data?.in_progress_tasks ?? 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const projectName = input.project_context?.project_name ?? 'Project';
    const title = `${projectName} ${reportTypeLabel} (${input.date_from} ~ ${input.date_to})`;
    const summary = `本报告覆盖 ${input.date_from} 至 ${input.date_to} 期间。共有 ${totalTasks} 个任务，已完成 ${completedTasks} 个（完成率 ${completionRate}%），进行中 ${inProgressTasks} 个。`;
    let content = `# ${title}\n\n`;
    content += `## 概述\n\n`;
    content += `报告周期：${input.date_from} 至 ${input.date_to}\n\n`;
    content += `## 任务进度\n\n`;
    content += `| 状态 | 数量 |\n|------|------|\n`;
    content += `| 总计 | ${totalTasks} |\n`;
    content += `| 已完成 | ${completedTasks} |\n`;
    content += `| 进行中 | ${inProgressTasks} |\n`;
    content += `| 阻塞 | ${blockedTasks} |\n`;
    content += `| 延期 | ${delayedTasks} |\n\n`;
    content += `完成率：${completionRate}%\n`;
    if (input.team_data?.members && input.team_data.members.length > 0) {
        content += `\n## 团队表现\n\n`;
        for (const member of input.team_data.members) {
            content += `- **${member.name}**: 完成 ${member.completed_count ?? 0} 个任务，进行中 ${member.in_progress_count ?? 0} 个\n`;
        }
    }
    let riskSummary;
    if (blockedTasks > 0 || delayedTasks > 0) {
        const risks = [];
        if (blockedTasks > 0) {
            risks.push(`${blockedTasks} 个任务处于阻塞状态，建议尽快排查阻塞原因并协调资源解决。`);
        }
        if (delayedTasks > 0) {
            risks.push(`${delayedTasks} 个任务已延期，建议重新评估优先级和截止日期。`);
        }
        riskSummary = risks.join(' ');
    }
    const response = {
        schema_version: versionConfig.schemaVersion,
        biz_ref_id: `report_${input.report_type}_${input.date_from}`,
        confidence: 0.85,
        reason: `Generated ${input.report_type} report based on task and team data for the specified period.`,
        title,
        summary,
        content,
    };
    if (riskSummary) {
        response.risk_summary = riskSummary;
    }
    return JSON.stringify(response);
}
class ReportGenerateHandler {
    aiClient;
    logger = new common_1.Logger(ReportGenerateHandler.name);
    constructor(aiClient) {
        this.aiClient = aiClient;
    }
    async execute(inputPayload) {
        const input = inputPayload;
        this.logger.log(`Generating ${input.report_type} report for period ${input.date_from} to ${input.date_to}`);
        const prompt = buildReportPrompt(input);
        this.logger.debug(`Report prompt built (${prompt.length} chars)`);
        let rawResponse;
        if (this.aiClient) {
            try {
                rawResponse = await this.aiClient.chat(prompt, '你是一个项目管理报告生成AI助手。请严格按照用户要求的JSON格式返回结果，不要添加任何额外文字。');
                this.logger.log('使用真实 AI 模型生成报告');
            }
            catch (error) {
                this.logger.warn(`AI 调用失败，回退到模拟数据: ${error.message}`);
                rawResponse = generateMockReportResponse(input);
            }
        }
        else {
            rawResponse = generateMockReportResponse(input);
        }
        const validated = (0, output_validator_1.validateAiOutput)(rawResponse, output_validator_1.ReportGenerationOutputSchema);
        this.logger.log(`Report generated successfully: "${validated.title}"`);
        return {
            outputPayload: validated,
            rawResponse,
        };
    }
}
exports.ReportGenerateHandler = ReportGenerateHandler;
//# sourceMappingURL=report-generate.handler.js.map