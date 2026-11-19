import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';

import { validacion } from '../admin/validacion.js';
import { UserGuard, type PeticionDeUsuario } from '../auth/user.guard.js';
import { ViajeService } from './viaje.service.js';
import { CreateViajeDto } from './dto/create-viaje.dto.js';

// publicar viajes; comparte la ruta base con TripsController (que solo usa /:id/...)
@Controller('driver/trips')
@UseGuards(UserGuard)
@UsePipes(validacion)
export class ViajeController {
  constructor(private readonly viajeService: ViajeService) {}

  // POST /api/driver/trips
  @Post()
  crear(@Body() dto: CreateViajeDto, @Req() peticion: PeticionDeUsuario) {
    return this.viajeService.crear(peticion.usuarioId, dto);
  }
}
