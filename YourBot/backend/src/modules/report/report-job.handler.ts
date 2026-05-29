import { Logger } from '@nestjs/common';
import { AiJobHandler, AiJobHandlerResult } from '../ai/interfaces';
import { ReportGenerateHandler } from '../ai/handlers';
import { AiClient } from '../ai/ai-client';
import { ReportService } from './report.service';

/**
 * Report job handler that wraps the AI report generation handler
 * and saves the generated report to the database on success.
 */
export class ReportJobHandler implements AiJobHandler {
  private readonly logger = new Logger(ReportJobHandler.name);
  private readonly innerHandler: ReportGenerateHandler;

  constructor(
    private readonly reportService: ReportService,
    aiClient?: AiClient,
  ) {
    this.innerHandler = new ReportGenerateHandler(aiClient);
  }

  async execute(inputPayload: Record<string, any>): Promise<AiJobHandlerResult> {
    const result = await this.innerHandler.execute(inputPayload);

    const userId = BigInt(inputPayload.created_by);
    await this.reportService.onReportJobSuccess(
      '',
      result.outputPayload,
      userId,
      inputPayload,
    );

    this.logger.log('Report generated and saved successfully');
    return result;
  }
}
