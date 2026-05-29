import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppConfigModule } from './common/config';
import { IdempotencyMiddleware } from './common/middleware';
import { PrismaModule } from './infra/prisma';
import { AuthModule } from './modules/auth';
import { UserModule } from './modules/user';
import { RequirementModule } from './modules/requirement';
import { TaskModule } from './modules/task';
import { AiModule } from './modules/ai';
import { ReportModule } from './modules/report';
import { AlertModule } from './modules/alert';
import { DashboardModule } from './modules/dashboard';
import { NotificationModule } from './modules/notification';
import { RealtimeModule } from './modules/realtime';
import { AuditModule } from './modules/audit';
import { OutboxModule } from './modules/outbox';

@Module({
  imports: [
    // Infrastructure
    AppConfigModule,
    PrismaModule,

    // Feature modules
    AuthModule,
    UserModule,
    RequirementModule,
    TaskModule,
    AiModule,
    ReportModule,
    AlertModule,
    DashboardModule,
    NotificationModule,
    RealtimeModule,
    AuditModule,
    OutboxModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(IdempotencyMiddleware)
      .forRoutes(
        { path: '*', method: RequestMethod.POST },
        { path: '*', method: RequestMethod.PUT },
        { path: '*', method: RequestMethod.PATCH },
        { path: '*', method: RequestMethod.DELETE },
      );
  }
}
