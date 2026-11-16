import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { StatisticsModule } from '../statistics/statistics.module.js';

@Module({
  imports: [AdminModule, AuthModule, StatisticsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
