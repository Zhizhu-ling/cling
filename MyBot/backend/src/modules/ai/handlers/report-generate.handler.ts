import { Logger } from '@nestjs/common';
import { AiJobHandler, AiJobHandlerResult } from '../interfaces';
import {
  ReportGenerationOutputSchema,
  validateAiOutput,
} from '../output-validator';
import { getPromptVersionConfig } from '../config';
import { AiJobType } from '../../../domain/enums';
import { AiClient } from '../ai-client';

/**
 * Input payload for report generation job.
 */
export interface ReportGenerateInput {
  /** Type of report: daily, weekly, or stage */
  report_type: 'daily' | 'weekly' | 'stage';

  /** Start date of the report period (ISO date string) */
  date_from: string;

  /** End date of the report period (ISO date string) */
  date_to: string;

  /** Project context for the report */
  project_context?: {
    project_id?: string;
    project_name?: string;
    team_size?: number;
  };

  /** Task data summary for the report period */
  task_data?: {
    total_tasks?: number;
    completed_tasks?: number;
    blocked_tasks?: number;
    delayed_tasks?: number;
    in_progress_tasks?: number;
  };

  /** Team data summary for the report period */
  team_data?: {
    members?: Array<{
      name: string;
      completed_count?: number;
      in_progress_count?: number;
    }>;
  };
}

/**
 * Builds a prompt template for report generation.
 * Includes prompt_version for traceability and future LLM integration.
 */
export function buildReportPrompt(input: ReportGenerateInput): string {
  const versionConfig = getPromptVersionConfig(AiJobType.REPORT_GENERATE);

  const reportTypeLabels: Record<string, string> = {
    daily: '日报 (Daily Report)',
    weekly: '周报 (Weekly Report)',
    stage: '阶段报告 (Stage Report)',
  };

  const reportTypeLabel =
    reportTypeLabels[input.report_type] || input.report_type;

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

/**
 * Generates a mock/placeholder AI response for report generation.
 * For MVP: simulates AI call by returning structured report content
 * based on the input data.
 */
export function generateMockReportResponse(
  input: ReportGenerateInput,
): string {
  const versionConfig = getPromptVersionConfig(AiJobType.REPORT_GENERATE);

  const reportTypeLabels: Record<string, string> = {
    daily: '日报',
    weekly: '周报',
    stage: '阶段报告',
  };

  const reportTypeLabel =
    reportTypeLabels[input.report_type] || input.report_type;

  const totalTasks = input.task_data?.total_tasks ?? 0;
  const completedTasks = input.task_data?.completed_tasks ?? 0;
  const blockedTasks = input.task_data?.blocked_tasks ?? 0;
  const delayedTasks = input.task_data?.delayed_tasks ?? 0;
  const inProgressTasks = input.task_data?.in_progress_tasks ?? 0;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const projectName =
    input.project_context?.project_name ?? 'Project';

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

  let riskSummary: string | undefined;
  if (blockedTasks > 0 || delayedTasks > 0) {
    const risks: string[] = [];
    if (blockedTasks > 0) {
      risks.push(
        `${blockedTasks} 个任务处于阻塞状态，建议尽快排查阻塞原因并协调资源解决。`,
      );
    }
    if (delayedTasks > 0) {
      risks.push(
        `${delayedTasks} 个任务已延期，建议重新评估优先级和截止日期。`,
      );
    }
    riskSummary = risks.join(' ');
  }

  const response: Record<string, any> = {
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

/**
 * AI job handler for report generation.
 *
 * Responsibilities:
 * 1. Build a prompt template from report context (type, date range, task data, team data)
 * 2. Simulate AI call (MVP - no real LLM connected)
 * 3. Validate output against ReportGenerationOutputSchema
 * 4. Return structured result with title, summary, content, and risk_summary
 *
 * Validates: Requirements 8.1, 8.5
 */
export class ReportGenerateHandler implements AiJobHandler {
  private readonly logger = new Logger(ReportGenerateHandler.name);

  constructor(private readonly aiClient?: AiClient) {}

  async execute(
    inputPayload: Record<string, any>,
  ): Promise<AiJobHandlerResult> {
    const input = inputPayload as ReportGenerateInput;

    this.logger.log(
      `Generating ${input.report_type} report for period ${input.date_from} to ${input.date_to}`,
    );

    // Build the prompt
    const prompt = buildReportPrompt(input);
    this.logger.debug(`Report prompt built (${prompt.length} chars)`);

    let rawResponse: string;

    // Try real AI call, fall back to simulation
    if (this.aiClient) {
      try {
        rawResponse = await this.aiClient.chat(prompt, '你是一个项目管理报告生成AI助手。请严格按照用户要求的JSON格式返回结果，不要添加任何额外文字。');
        this.logger.log('使用真实 AI 模型生成报告');
      } catch (error: any) {
        this.logger.warn(`AI 调用失败，回退到模拟数据: ${error.message}`);
        rawResponse = generateMockReportResponse(input);
      }
    } else {
      rawResponse = generateMockReportResponse(input);
    }

    // Validate output against Zod schema
    const validated = validateAiOutput(
      rawResponse,
      ReportGenerationOutputSchema,
    );

    this.logger.log(
      `Report generated successfully: "${(validated as any).title}"`,
    );

    return {
      outputPayload: validated as unknown as Record<string, any>,
      rawResponse,
    };
  }
}
