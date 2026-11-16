import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { StatisticsModule } from '../statistics/statistics.module.js'; // Modulo necesario para estadisticas -PabloArg.

@Module({
  imports: [StatisticsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
