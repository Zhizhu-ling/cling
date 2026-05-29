import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { PrismaModule } from '../../infra/prisma';
import { AiModule } from '../ai/ai.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [PrismaModule, AiModule, OutboxModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
