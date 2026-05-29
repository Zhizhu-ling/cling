import { Module, OnModuleInit } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { AiModule } from '../ai/ai.module';
import { OutboxModule } from '../outbox/outbox.module';
import { AiJobService } from '../ai/ai-job.service';
import { AiClient } from '../ai/ai-client';
import { AiJobType } from '../../domain/enums';
import { ReportJobHandler } from './report-job.handler';

@Module({
  imports: [AiModule, OutboxModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule implements OnModuleInit {
  constructor(
    private readonly aiJobService: AiJobService,
    private readonly reportService: ReportService,
    private readonly aiClient: AiClient,
  ) {}

  onModuleInit(): void {
    this.aiJobService.registerHandler(
      AiJobType.REPORT_GENERATE,
      new ReportJobHandler(this.reportService, this.aiClient),
    );
  }
}
