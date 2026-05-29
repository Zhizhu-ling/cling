import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT || '3000', 10),
  prefix: process.env.APP_PREFIX || 'api/v1',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  ai: {
    modelEndpoint: process.env.AI_MODEL_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    modelName: process.env.AI_MODEL_NAME || 'qwen-plus',
    apiKey: process.env.AI_API_KEY || '',
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '60000', 10),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
}));
