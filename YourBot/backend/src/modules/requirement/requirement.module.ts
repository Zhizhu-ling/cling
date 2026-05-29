import { Module } from '@nestjs/common';
import { RequirementService } from './requirement.service';
import { RequirementController } from './requirement.controller';
import { PrismaModule } from '../../infra/prisma';
import { AiModule } from '../ai/ai.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [PrismaModule, AiModule, OutboxModule],
  controllers: [RequirementController],
  providers: [RequirementService],
  exports: [RequirementService],
})
export class RequirementModule {}
