import { Module } from '@nestjs/common';
import { MailService } from '../admin/mail.service.js';
import { TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

// módulo del viaje desde el lado del conductor: consultar, iniciar, finalizar y cancelar. autor: Wes, 2026-11-18
@Module({
  controllers: [TripsController],
  // MailService avisa las cancelaciones a los pasajeros
  providers: [TripsService, MailService],
})
export class TripsModule {}
