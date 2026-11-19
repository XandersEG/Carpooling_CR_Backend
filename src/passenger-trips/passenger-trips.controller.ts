import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { validacion } from '../admin/validacion.js';
import { UserGuard, type PeticionDeUsuario } from '../auth/user.guard.js';
import { CreateJoinRequestDto } from './dto/create-join-request.dto.js';
import { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import { PassengerTripsService } from './passenger-trips.service.js';

// un id que no es un número no puede ser de ningún viaje
const idDeViaje = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException('El viaje no existe.'),
});

// rutas del viaje para el pasajero; todas piden sesión de usuario
@Controller('passenger/trips')
@UseGuards(UserGuard)
@UsePipes(validacion)
export class PassengerTripsController {
  constructor(private readonly trips: PassengerTripsService) {}

  @Get()
  disponibles(
    @Query() filtros: ListTripsQueryDto,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.trips.disponibles(peticion.usuarioId, filtros);
  }

  // "mine" y "upcoming" van antes de ':id' para que no se lean como un id
  @Get('mine')
  mias(@Req() peticion: PeticionDeUsuario) {
    return this.trips.misSolicitudes(peticion.usuarioId);
  }

  @Get('upcoming')
  proximos(@Req() peticion: PeticionDeUsuario) {
    return this.trips.proximos(peticion.usuarioId);
  }

  @Get(':id')
  obtener(
    @Param('id', idDeViaje) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.trips.obtener(id, peticion.usuarioId);
  }

  // POST devuelve 201 por defecto en Nest
  @Post(':id/join-requests')
  solicitarUnirse(
    @Param('id', idDeViaje) id: number,
    @Body() dto: CreateJoinRequestDto,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.trips.solicitarUnirse(id, peticion.usuarioId, dto);
  }

  @Delete(':id/join-requests')
  @HttpCode(204)
  cancelarSolicitud(
    @Param('id', idDeViaje) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.trips.cancelarSolicitud(id, peticion.usuarioId);
  }
}