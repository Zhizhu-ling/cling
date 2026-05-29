import { Module, OnModuleInit } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiJobService } from './ai-job.service';
import { AiClient } from './ai-client';
import { AiController } from './ai.controller';
import { AiJobType } from '../../domain/enums';
import {
  AssignmentSuggestHandler,
  ReportGenerateHandler,
  RequirementSplitHandler,
} from './handlers';

@Module({
  controllers: [AiController],
  providers: [AiService, AiJobService, AiClient],
  exports: [AiService, AiJobService, AiClient],
})
export class AiModule implements OnModuleInit {
  constructor(
    private readonly aiJobService: AiJobService,
    private readonly aiClient: AiClient,
  ) {}

  onModuleInit(): void {
    // Register all AI job handlers with the real AI client
    this.aiJobService.registerHandler(
      AiJobType.REQUIREMENT_SPLIT,
      new RequirementSplitHandler(this.aiClient),
    );
    this.aiJobService.registerHandler(
      AiJobType.ASSIGNMENT_SUGGEST,
      new AssignmentSuggestHandler(this.aiClient),
    );
    this.aiJobService.registerHandler(
      AiJobType.REPORT_GENERATE,
      new ReportGenerateHandler(this.aiClient),
    );
  }
}
