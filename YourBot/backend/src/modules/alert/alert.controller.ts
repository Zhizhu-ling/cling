import { Controller } from '@nestjs/common';
import { AlertService } from './alert.service';

@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}
}
