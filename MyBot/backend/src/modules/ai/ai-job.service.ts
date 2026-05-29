import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma';
import { AiJobStatus, AiJobType } from '../../domain/enums';
import { AiJobStateMachine } from '../../domain/state-machines';
import { CreateAiJobDto } from './dto';
import { getPromptVersionConfig } from './config';
import { AiJobHandler, AiJobHandlerResult } from './interfaces';

/**
 * AiJobService manages the lifecycle of AI jobs:
 * - Creating jobs (pending)
 * - Dispatching jobs to the worker queue
 * - Worker execution: pending → running → success/fail
 * - Querying job status
 * - Canceling pending jobs
 *
 * Validates: Requirements 3.1, 3.5, 3.6, 4.3, 4.4, 8.5, 8.6
 */
@Injectable()
export class AiJobService {
  private readonly logger = new Logger(AiJobService.name);

  /**
   * Registry of job handlers by job type.
   * Handlers are registered via registerHandler() method.
   */
  private readonly handlers = new Map<AiJobType, AiJobHandler>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register an AI job handler for a specific job type.
   * This allows other modules to plug in their handler logic.
   */
  registerHandler(jobType: AiJobType, handler: AiJobHandler): void {
    this.handlers.set(jobType, handler);
    this.logger.log(`Registered AI job handler for type: ${jobType}`);
  }

  /**
   * Create a new AI job with status=pending.
   * Applies prompt versioning based on job type.
   *
   * @returns The created job ID as a string.
   */
  async createJob(dto: CreateAiJobDto): Promise<string> {
    const versionConfig = getPromptVersionConfig(
      dto.jobType,
      dto.templateName,
    );

    const job = await this.prisma.aiJob.create({
      data: {
        jobType: dto.jobType,
        status: AiJobStatus.PENDING,
        requestId: dto.requestId,
        bizRefId: dto.bizRefId ?? null,
        inputPayload: dto.inputPayload,
        promptVersion: versionConfig.promptVersion,
        schemaVersion: versionConfig.schemaVersion,
        maxRetry: dto.maxRetry ?? 3,
        createdBy: dto.createdBy,
      },
    });

    this.logger.log(
      `Created AI job ${job.id} (type=${dto.jobType}, promptVersion=${versionConfig.promptVersion}, schemaVersion=${versionConfig.schemaVersion}, template=${versionConfig.templateName})`,
    );

    return job.id.toString();
  }

  /**
   * Dispatch a job for processing.
   * For MVP, uses setImmediate to process asynchronously without an external queue.
   */
  dispatchJob(jobId: string): void {
    this.logger.log(`Dispatching AI job ${jobId} for processing`);

    // Use setImmediate for async processing (MVP - no external queue)
    setImmediate(() => {
      this.processJob(jobId).catch((err) => {
        this.logger.error(
          `Unhandled error processing AI job ${jobId}: ${err.message}`,
          err.stack,
        );
      });
    });
  }

  /**
   * Create and immediately dispatch a job.
   * Convenience method combining createJob + dispatchJob.
   */
  async createAndDispatch(dto: CreateAiJobDto): Promise<string> {
    const jobId = await this.createJob(dto);
    this.dispatchJob(jobId);
    return jobId;
  }

  /**
   * Get job status and result.
   */
  async getJob(jobId: string) {
    const job = await this.prisma.aiJob.findUnique({
      where: { id: BigInt(jobId) },
    });

    if (!job) {
      throw new NotFoundException(`AI job ${jobId} not found`);
    }

    return {
      id: job.id.toString(),
      jobType: job.jobType,
      status: job.status,
      requestId: job.requestId,
      bizRefId: job.bizRefId?.toString() ?? null,
      inputPayload: job.inputPayload,
      outputPayload: job.outputPayload,
      rawResponse: job.rawResponse,
      promptVersion: job.promptVersion,
      schemaVersion: job.schemaVersion,
      retryCount: job.retryCount,
      maxRetry: job.maxRetry,
      errorMessage: job.errorMessage,
      createdBy: job.createdBy.toString(),
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }

  /**
   * Cancel a pending job.
   * Only jobs in 'pending' status can be canceled.
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.prisma.aiJob.findUnique({
      where: { id: BigInt(jobId) },
    });

    if (!job) {
      throw new NotFoundException(`AI job ${jobId} not found`);
    }

    const currentStatus = job.status as AiJobStatus;
    const validation = AiJobStateMachine.validateTransition(
      currentStatus,
      AiJobStatus.CANCELED,
    );

    if (!validation.valid) {
      throw new Error(
        validation.error ?? `Cannot cancel job in status '${currentStatus}'`,
      );
    }

    await this.prisma.aiJob.update({
      where: { id: BigInt(jobId) },
      data: {
        status: AiJobStatus.CANCELED,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Canceled AI job ${jobId}`);
  }

  /**
   * Worker logic: processes a job through the state machine.
   * pending → running → success/fail
   */
  private async processJob(jobId: string): Promise<void> {
    const job = await this.prisma.aiJob.findUnique({
      where: { id: BigInt(jobId) },
    });

    if (!job) {
      this.logger.error(`AI job ${jobId} not found during processing`);
      return;
    }

    const currentStatus = job.status as AiJobStatus;

    // Validate transition: pending → running
    const toRunningValidation = AiJobStateMachine.validateTransition(
      currentStatus,
      AiJobStatus.RUNNING,
    );

    if (!toRunningValidation.valid) {
      this.logger.warn(
        `Cannot transition AI job ${jobId} to running: ${toRunningValidation.error}`,
      );
      return;
    }

    // Transition to running
    await this.prisma.aiJob.update({
      where: { id: BigInt(jobId) },
      data: {
        status: AiJobStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    this.logger.log(`AI job ${jobId} is now running`);

    // Execute the handler
    const jobType = job.jobType as AiJobType;
    const handler = this.handlers.get(jobType);

    try {
      if (!handler) {
        throw new Error(
          `No handler registered for AI job type: ${jobType}`,
        );
      }

      const result: AiJobHandlerResult = await handler.execute(
        job.inputPayload as Record<string, any>,
      );

      // Validate transition: running → success
      const toSuccessValidation = AiJobStateMachine.validateTransition(
        AiJobStatus.RUNNING,
        AiJobStatus.SUCCESS,
      );

      if (!toSuccessValidation.valid) {
        this.logger.error(
          `Cannot transition AI job ${jobId} to success: ${toSuccessValidation.error}`,
        );
        return;
      }

      // Transition to success
      await this.prisma.aiJob.update({
        where: { id: BigInt(jobId) },
        data: {
          status: AiJobStatus.SUCCESS,
          outputPayload: result.outputPayload,
          rawResponse: result.rawResponse ?? null,
          completedAt: new Date(),
        },
      });

      this.logger.log(`AI job ${jobId} completed successfully`);
    } catch (error: any) {
      this.logger.error(
        `AI job ${jobId} failed: ${error.message}`,
        error.stack,
      );

      // Validate transition: running → fail
      const toFailValidation = AiJobStateMachine.validateTransition(
        AiJobStatus.RUNNING,
        AiJobStatus.FAIL,
      );

      if (!toFailValidation.valid) {
        this.logger.error(
          `Cannot transition AI job ${jobId} to fail: ${toFailValidation.error}`,
        );
        return;
      }

      // Transition to fail
      await this.prisma.aiJob.update({
        where: { id: BigInt(jobId) },
        data: {
          status: AiJobStatus.FAIL,
          errorMessage: error.message,
          retryCount: { increment: 1 },
          completedAt: new Date(),
        },
      });
    }
  }
}
