import { Module } from '@nestjs/common';
import { ConcurrentPointsController } from './concurrent-points.controller.js';
import { ConcurrentPointsService } from './concurrent-points.service.js';

@Module({
  controllers: [ConcurrentPointsController],
  providers: [ConcurrentPointsService],
})
export class ConcurrentPointsModule {}