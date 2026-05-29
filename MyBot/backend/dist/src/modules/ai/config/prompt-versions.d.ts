import { AiJobType } from '../../../domain/enums';
export interface PromptVersionConfig {
    promptVersion: string;
    schemaVersion: string;
    templateName: string;
}
export declare const PROMPT_VERSIONS: Record<AiJobType, PromptVersionConfig>;
export declare function getPromptVersionConfig(jobType: AiJobType, templateNameOverride?: string): PromptVersionConfig;
