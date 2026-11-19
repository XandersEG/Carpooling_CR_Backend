import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { UserGuard, type PeticionDeUsuario } from '../auth/user.guard.js';
import { HistoryService } from './history.service.js';

// "Historial de viajes" de la app móvil; todas las rutas piden sesión de usuario
@Controller('history')
@UseGuards(UserGuard)
export class HistoryController {
  constructor(private readonly historial: HistoryService) {}

  // GET /api/history: viajes finalizados o cancelados, como conductor y como pasajero
  @Get()
  listar(@Req() peticion: PeticionDeUsuario) {
    return this.historial.listar(peticion.usuarioId);
  }

  // GET /api/history/:id  (c-<viajeId> o p-<solicitudId>)
  @Get(':id')
  detalle(@Param('id') id: string, @Req() peticion: PeticionDeUsuario) {
    return this.historial.detalle(peticion.usuarioId, id);
  }
}
