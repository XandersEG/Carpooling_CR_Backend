import { Module } from '@nestjs/common';
import { DriverRequestsController } from './driver-requests.controller.js';
import { DriverRequestsService } from './driver-requests.service.js';

@Module({
  controllers: [DriverRequestsController],
  providers: [DriverRequestsService],
})
export class DriverRequestsModule {}
