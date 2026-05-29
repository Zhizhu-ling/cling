import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { AiJobService } from './ai-job.service';
import { AiClient } from './ai-client';
import { JwtAuthGuard } from '../auth/guards';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiJobService: AiJobService,
    private readonly aiClient: AiClient,
  ) {}

  /**
   * GET /api/v1/ai/status
   * Check if AI service is available.
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus() {
    try {
      const response = await this.aiClient.chat('请回复"ok"', '你是一个测试助手，只需回复JSON格式：{"status":"ok"}');
      return { available: true, model: process.env.AI_MODEL_NAME || 'qwen-plus' };
    } catch (error: any) {
      return { available: false, model: process.env.AI_MODEL_NAME || 'qwen-plus', error: error.message };
    }
  }

  /**
   * GET /api/v1/ai/jobs/:id
   * Get AI job status and result.
   */
  @Get('jobs/:id')
  @UseGuards(JwtAuthGuard)
  async getJob(@Param('id') id: string) {
    return this.aiJobService.getJob(id);
  }

  /**
   * POST /api/v1/ai/jobs/:id/cancel
   * Cancel a pending AI job.
   */
  @Post('jobs/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async cancelJob(@Param('id') id: string) {
    await this.aiJobService.cancelJob(id);
    return { id, status: 'canceled' };
  }
}
