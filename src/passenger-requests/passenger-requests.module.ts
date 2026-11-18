import { Module } from '@nestjs/common';
import { PassengerRequestsController } from './passenger-requests.controller.js';
import { PassengerRequestsService } from './passenger-requests.service.js';

// módulo de las solicitudes de viaje desde el lado del pasajero. autor: Wes, 2026-11-18
@Module({
  controllers: [PassengerRequestsController],
  providers: [PassengerRequestsService],
})
export class PassengerRequestsModule {}
