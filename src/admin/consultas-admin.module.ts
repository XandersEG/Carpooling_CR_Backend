import { Module } from '@nestjs/common';
import { ConsultasAdminController } from './consultas-admin.controller.js';
import { ConsultasAdminService } from './consultas-admin.service.js';

@Module({
  controllers: [ConsultasAdminController],
  providers: [ConsultasAdminService],
})
export class ConsultasAdminModule {}
