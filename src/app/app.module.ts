import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { StatisticsModule } from '../statistics/statistics.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { PublicCatalogsModule } from '../catalogs/public-catalogs.module.js';

@Module({
  imports: [
    AdminModule,
    StatisticsModule,
    VehiclesModule,
    PublicCatalogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
