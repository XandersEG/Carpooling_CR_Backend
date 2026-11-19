import { Controller, Get, Query, UseGuards, UsePipes } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard.js';
import { ConcurrentPointsService } from './concurrent-points.service.js';
import { ConcurrentPointsDto } from './dto/concurrent-points.dto.js';
import { validacion } from '../admin/validacion.js';

@Controller('admin/concurrent-points')
@UseGuards(AdminGuard)
@UsePipes(validacion)
export class ConcurrentPointsController {
  constructor(private readonly servicio: ConcurrentPointsService) {}

  @Get()
  puntosConcurrentes(@Query() filtros: ConcurrentPointsDto) {
    return this.servicio.puntosConcurrentes(filtros);
  }
}