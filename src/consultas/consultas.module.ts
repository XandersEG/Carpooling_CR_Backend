import { Module } from '@nestjs/common';
import { ConsultasController } from './consultas.controller.js';
import { ConsultasService } from './consultas.service.js';

@Module({
  controllers: [ConsultasController],
  providers: [ConsultasService],
})
export class ConsultasModule {}