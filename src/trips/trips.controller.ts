import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { validacion } from '../admin/validacion.js';
import { UserGuard, type PeticionDeUsuario } from '../auth/user.guard.js';
import { CancelTripDto } from './dto/cancel-trip.dto.js';
import { TripsService } from './trips.service.js';

// un id que no es un número no puede ser de ningún viaje
const idDeViaje = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException('El viaje no existe.'),
});

// rutas del viaje para su conductor; todas piden sesión de usuario. autor: Wes, 2026-11-18
@Controller('driver/trips')
@UseGuards(UserGuard)
@UsePipes(validacion)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get(':id')
  obtener(
    @Param('id', idDeViaje) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.trips.obtener(id, peticion.usuarioId);
  }

  @Post(':id/start')
  @HttpCode(200)
  iniciar(
    @Param('id', idDeViaje) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.trips.iniciar(id, peticion.usuarioId);
  }

  @Post(':id/finish')
  @HttpCode(200)
  finalizar(
    @Param('id', idDeViaje) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.trips.finalizar(id, peticion.usuarioId);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancelar(
    @Param('id', idDeViaje) id: number,
    @Body() dto: CancelTripDto,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.trips.cancelar(id, peticion.usuarioId, dto);
  }
}
