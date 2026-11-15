import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';

@Module({
  imports: [DatabaseModule, VehiclesModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
