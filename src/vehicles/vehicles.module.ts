
import { Module } from '@nestjs/common';

import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';
import { VehiculoRepo } from './vehiculo.repo.js';

@Module({
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiculoRepo],
  exports: [VehiclesService],
})
export class VehiclesModule {}
