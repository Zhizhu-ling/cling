import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    OutboxModule,
  ],
  controllers: [AlertController],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
