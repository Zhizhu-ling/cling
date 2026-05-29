import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { NetworkError, TimeoutError } from './errors';

/**
 * AI 模型调用客户端
 * 封装对阿里百炼 DashScope API（OpenAI 兼容模式）的调用
 */
@Injectable()
export class AiClient {
  private readonly logger = new Logger(AiClient.name);
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly modelName: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>(
      'app.ai.modelEndpoint',
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    );
    this.apiKey = this.configService.get<string>('app.ai.apiKey', '');
    this.modelName = this.configService.get<string>('app.ai.modelName', 'qwen-plus');
    this.timeoutMs = this.configService.get<number>('app.ai.timeoutMs', 60000);
  }

  /**
   * 调用 AI 模型，发送 prompt 并返回文本响应
   * 使用 OpenAI 兼容的 chat/completions 接口
   */
  async chat(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      this.logger.warn('AI_API_KEY 未配置，使用模拟响应');
      throw new NetworkError('AI_API_KEY not configured');
    }

    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    this.logger.log(
      `调用 AI 模型: ${this.modelName}, prompt 长度: ${prompt.length} 字符`,
    );

    try {
      const response = await axios.post(
        this.endpoint,
        {
          model: this.modelName,
          messages,
          temperature: 0.7,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: this.timeoutMs,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new NetworkError('AI 模型返回空响应');
      }

      this.logger.log(
        `AI 响应成功，长度: ${content.length} 字符，tokens: ${JSON.stringify(response.data?.usage ?? {})}`,
      );

      return content;
    } catch (error: any) {
      if (error instanceof NetworkError || error instanceof TimeoutError) {
        throw error;
      }

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new TimeoutError(`AI 模型调用超时 (${this.timeoutMs}ms)`);
      }

      if (error.response) {
        const status = error.response.status;
        const msg = error.response.data?.error?.message || error.message;
        this.logger.error(`AI API 错误 [${status}]: ${msg}`);
        throw new NetworkError(`AI API 错误 [${status}]: ${msg}`);
      }

      throw new NetworkError(`AI 调用失败: ${error.message}`);
    }
  }
}
