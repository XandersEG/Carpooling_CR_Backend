import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller.js';
import { HistoryService } from './history.service.js';

// historial de viajes del usuario de la app (conductor y pasajero)
@Module({
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
