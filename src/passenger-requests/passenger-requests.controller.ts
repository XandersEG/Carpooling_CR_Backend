import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserGuard, type PeticionDeUsuario } from '../auth/user.guard.js';
import { PassengerRequestsService } from './passenger-requests.service.js';

// un id que no es un número no puede ser de ninguna solicitud
const idDeSolicitud = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException('La solicitud no existe.'),
});

// rutas de las solicitudes del pasajero; piden sesión de usuario. autor: Wes, 2026-11-18
@Controller('passenger/requests')
@UseGuards(UserGuard)
export class PassengerRequestsController {
  constructor(private readonly solicitudes: PassengerRequestsService) {}

  @Get()
  listar(@Req() peticion: PeticionDeUsuario) {
    return this.solicitudes.listar(peticion.usuarioId);
  }

  @Get(':id')
  obtener(
    @Param('id', idDeSolicitud) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.solicitudes.obtener(id, peticion.usuarioId);
  }
}
