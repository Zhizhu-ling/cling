import { AiJobType } from '../../../domain/enums';

/**
 * DTO for creating a new AI job
 */
export interface CreateAiJobDto {
  /** The type of AI job to execute */
  jobType: AiJobType;

  /** Business reference ID (e.g., requirement_id, task_id) */
  bizRefId?: bigint;

  /** Input payload to send to the AI handler */
  inputPayload: Record<string, any>;

  /** ID of the user creating the job */
  createdBy: bigint;

  /** Request ID for tracing */
  requestId: string;

  /** Optional: override max retry count (default: 3) */
  maxRetry?: number;

  /** Optional: override prompt template name */
  templateName?: string;
}
