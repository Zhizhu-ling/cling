import { AiJobType } from '../../../domain/enums';

/**
 * Prompt version configuration per AI job type.
 * Each scenario has a prompt_version, schema_version, and template_name.
 */
export interface PromptVersionConfig {
  /** Version of the prompt template (e.g., "1.0.0") */
  promptVersion: string;

  /** Version of the expected output schema (e.g., "1.0.0") */
  schemaVersion: string;

  /** Name of the prompt template used */
  templateName: string;
}

/**
 * Registry of prompt versions per job type.
 * When prompts are updated, increment the version here.
 */
export const PROMPT_VERSIONS: Record<AiJobType, PromptVersionConfig> = {
  [AiJobType.REQUIREMENT_SPLIT]: {
    promptVersion: '1.0.0',
    schemaVersion: '1.0.0',
    templateName: 'requirement_split_v1',
  },
  [AiJobType.ASSIGNMENT_SUGGEST]: {
    promptVersion: '1.0.0',
    schemaVersion: '1.0.0',
    templateName: 'assignment_suggest_v1',
  },
  [AiJobType.REPORT_GENERATE]: {
    promptVersion: '1.0.0',
    schemaVersion: '1.0.0',
    templateName: 'report_generate_v1',
  },
};

/**
 * Get prompt version config for a given job type, with optional template override.
 */
export function getPromptVersionConfig(
  jobType: AiJobType,
  templateNameOverride?: string,
): PromptVersionConfig {
  const config = PROMPT_VERSIONS[jobType];
  if (templateNameOverride) {
    return { ...config, templateName: templateNameOverride };
  }
  return config;
}
