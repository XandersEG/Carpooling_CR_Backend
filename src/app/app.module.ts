import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { StatisticsModule } from '../statistics/statistics.module.js';
import { ConsultasModule } from '../consultas/consultas.module.js';

@Module({
  imports: [AdminModule, StatisticsModule, ConsultasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}