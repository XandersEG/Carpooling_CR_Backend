
import { Module } from '@nestjs/common';
import { ViajeController } from './viaje.controller.js';
import { ViajeService } from './viaje.service.js';
import { ViajeRepo } from './viaje.repo.js';

@Module({
  controllers: [ViajeController],
  providers: [ViajeService, ViajeRepo],
  exports: [ViajeService],
})
export class ViajeModule {}
