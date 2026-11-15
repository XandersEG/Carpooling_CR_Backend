import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { VehiclesService } from './vehicles.service.js';

@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
  ) {}

  @Get('user/:usuarioId')
  findAllByUser(
    @Param('usuarioId', ParseIntPipe)
    usuarioId: number,
  ) {
    return this.vehiclesService.findAllByUser(
      usuarioId,
    );
  }

  @Delete(':id/user/:usuarioId')
  remove(
    @Param('id', ParseIntPipe)
    id: number,

    @Param('usuarioId', ParseIntPipe)
    usuarioId: number,
  ) {
    return this.vehiclesService.remove(
      id,
      usuarioId,
    );
  }
}