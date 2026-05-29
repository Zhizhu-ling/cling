import { Logger } from '@nestjs/common';
import { AiJobHandler, AiJobHandlerResult } from '../interfaces';
import { validateAiOutput } from '../output-validator';
import { TaskDecompositionOutputSchema } from '../output-validator';
import { PROMPT_VERSIONS } from '../config';
import { AiJobType } from '../../../domain/enums';
import { AiClient } from '../ai-client';

/**
 * Input payload expected by the requirement split handler.
 */
export interface RequirementSplitInput {
  requirement_id: string;
  title: string;
  background: string;
  objective: string;
  constraints?: string;
  deliverables: string[] | Record<string, any>[];
}

/**
 * Prompt template for requirement decomposition.
 * Uses structured prompt engineering to guide the AI model.
 */
const REQUIREMENT_SPLIT_PROMPT_TEMPLATE = `你是一个专业的项目管理AI助手。你的任务是将一个业务需求拆解为结构化的任务树。

## 需求信息

**标题：** {{title}}
**背景：** {{background}}
**目标：** {{objective}}
**约束条件：** {{constraints}}
**交付物：** {{deliverables}}

## 要求

请分析上述需求，将其拆解为层级化的任务树。每个任务应该：
- 具体可执行
- 可以估算工时（小时）
- 有明确的验收标准
- 标注与其他任务的依赖关系

## 输出格式

请严格返回以下 JSON 格式（不要添加任何额外文字）：
{
  "schema_version": "{{schema_version}}",
  "biz_ref_id": "{{requirement_id}}",
  "confidence": <0到1之间的数字>,
  "reason": "<拆解思路说明>",
  "tasks": [
    {
      "task_key": "<唯一标识如 T1, T2, T3...>",
      "title": "<任务标题，用中文>",
      "description": "<详细描述，用中文>",
      "estimated_hours": <正数>,
      "dependencies": ["<依赖的task_key>"],
      "acceptance_criteria": "<验收标准，用中文>",
      "parent_key": "<父任务的task_key，顶层任务不填>"
    }
  ]
}

注意：
- task_key 必须唯一
- dependencies 引用有效的 task_key
- estimated_hours 必须是合理的正数
- 顶层任务不要填 parent_key
- 子任务通过 parent_key 引用父任务
- 所有文本内容请使用中文
`;

/**
 * Builds the prompt from the template and input data.
 */
function buildPrompt(input: RequirementSplitInput): string {
  const versionConfig = PROMPT_VERSIONS[AiJobType.REQUIREMENT_SPLIT];

  let prompt = REQUIREMENT_SPLIT_PROMPT_TEMPLATE;
  prompt = prompt.replace('{{title}}', input.title);
  prompt = prompt.replace('{{background}}', input.background);
  prompt = prompt.replace('{{objective}}', input.objective);
  prompt = prompt.replace('{{constraints}}', input.constraints ?? 'None specified');
  prompt = prompt.replace(
    '{{deliverables}}',
    Array.isArray(input.deliverables)
      ? input.deliverables
          .map((d) => (typeof d === 'string' ? d : JSON.stringify(d)))
          .join('\n- ')
      : JSON.stringify(input.deliverables),
  );
  prompt = prompt.replace('{{schema_version}}', versionConfig.schemaVersion);
  prompt = prompt.replace('{{requirement_id}}', input.requirement_id);

  return prompt;
}

/**
 * Generates a mock/simulated AI response for requirement decomposition.
 * For MVP: since no real LLM is connected yet, this produces a structured response
 * based on the input requirement data.
 */
function simulateAiResponse(input: RequirementSplitInput): string {
  const versionConfig = PROMPT_VERSIONS[AiJobType.REQUIREMENT_SPLIT];

  const deliverablesList = Array.isArray(input.deliverables)
    ? input.deliverables.map((d) => (typeof d === 'string' ? d : JSON.stringify(d)))
    : [JSON.stringify(input.deliverables)];

  // Generate tasks based on deliverables - one parent task per deliverable
  const tasks: Array<{
    task_key: string;
    title: string;
    description: string;
    estimated_hours: number;
    dependencies: string[];
    acceptance_criteria: string;
    parent_key?: string;
  }> = [];

  deliverablesList.forEach((deliverable, index) => {
    const parentKey = `T${index + 1}`;

    // Parent task for each deliverable
    tasks.push({
      task_key: parentKey,
      title: `Implement: ${typeof deliverable === 'string' ? deliverable : `Deliverable ${index + 1}`}`,
      description: `Implement the deliverable: ${deliverable}. This is part of the requirement "${input.title}".`,
      estimated_hours: 8,
      dependencies: index > 0 ? [`T${index}`] : [],
      acceptance_criteria: `Deliverable "${deliverable}" is fully implemented and tested.`,
    });

    // Sub-task: design
    tasks.push({
      task_key: `${parentKey}.1`,
      title: `Design: ${typeof deliverable === 'string' ? deliverable : `Deliverable ${index + 1}`}`,
      description: `Design the technical approach for: ${deliverable}`,
      estimated_hours: 2,
      dependencies: [],
      acceptance_criteria: `Technical design document is reviewed and approved.`,
      parent_key: parentKey,
    });

    // Sub-task: implementation
    tasks.push({
      task_key: `${parentKey}.2`,
      title: `Develop: ${typeof deliverable === 'string' ? deliverable : `Deliverable ${index + 1}`}`,
      description: `Develop and implement: ${deliverable}`,
      estimated_hours: 4,
      dependencies: [`${parentKey}.1`],
      acceptance_criteria: `Code is implemented, reviewed, and merged.`,
      parent_key: parentKey,
    });

    // Sub-task: testing
    tasks.push({
      task_key: `${parentKey}.3`,
      title: `Test: ${typeof deliverable === 'string' ? deliverable : `Deliverable ${index + 1}`}`,
      description: `Write and execute tests for: ${deliverable}`,
      estimated_hours: 2,
      dependencies: [`${parentKey}.2`],
      acceptance_criteria: `All tests pass with adequate coverage.`,
      parent_key: parentKey,
    });
  });

  const response = {
    schema_version: versionConfig.schemaVersion,
    biz_ref_id: input.requirement_id,
    confidence: 0.85,
    reason: `Decomposed requirement "${input.title}" into ${tasks.length} tasks based on ${deliverablesList.length} deliverable(s). Each deliverable is broken into design, development, and testing phases.`,
    tasks,
  };

  return JSON.stringify(response);
}

/**
 * Handler for AI requirement split jobs.
 *
 * Responsibilities:
 * 1. Build a prompt template from requirement data
 * 2. Call real AI model (falls back to simulation if unavailable)
 * 3. Validate output against TaskDecompositionOutputSchema
 * 4. Return structured result WITHOUT persisting to tasks table
 *
 * Validates: Requirements 3.1, 3.2, 3.5
 */
export class RequirementSplitHandler implements AiJobHandler {
  private readonly logger = new Logger(RequirementSplitHandler.name);

  constructor(private readonly aiClient?: AiClient) {}

  async execute(inputPayload: Record<string, any>): Promise<AiJobHandlerResult> {
    const input = inputPayload as RequirementSplitInput;

    this.logger.log(
      `Processing requirement split for requirement_id=${input.requirement_id}`,
    );

    // Build prompt from template
    const prompt = buildPrompt(input);
    this.logger.debug(`Built prompt (${prompt.length} chars) for requirement split`);

    let rawResponse: string;

    // Try real AI call, fall back to simulation
    if (this.aiClient) {
      try {
        rawResponse = await this.aiClient.chat(prompt, '你是一个专业的项目管理AI助手。请将需求拆解为结构化的任务树，严格按照要求的JSON格式返回结果，所有任务标题和描述必须使用中文，不要添加任何额外文字。');
        this.logger.log('使用真实 AI 模型生成任务树');
      } catch (error: any) {
        this.logger.warn(`AI 调用失败，回退到模拟数据: ${error.message}`);
        rawResponse = simulateAiResponse(input);
      }
    } else {
      rawResponse = simulateAiResponse(input);
    }

    // Validate output against Zod schema - fall back to simulation if validation fails
    let validatedOutput: any;
    try {
      validatedOutput = validateAiOutput(rawResponse, TaskDecompositionOutputSchema);
    } catch (validationError: any) {
      this.logger.warn(`AI 返回格式验证失败，回退到模拟数据: ${validationError.message}`);
      rawResponse = simulateAiResponse(input);
      validatedOutput = validateAiOutput(rawResponse, TaskDecompositionOutputSchema);
    }

    this.logger.log(
      `Validated task decomposition output: ${validatedOutput.tasks.length} tasks`,
    );

    return {
      outputPayload: validatedOutput as unknown as Record<string, any>,
      rawResponse,
    };
  }
}
