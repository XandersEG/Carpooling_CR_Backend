import {
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserGuard, type PeticionDeUsuario } from '../auth/user.guard.js';
import { DriverRequestsService } from './driver-requests.service.js';

const idDeSolicitud = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException('La solicitud no existe.'),
});

@Controller('driver/requests')
@UseGuards(UserGuard)
export class DriverRequestsController {
  constructor(private readonly solicitudes: DriverRequestsService) {}

  @Get()
  listar(@Req() peticion: PeticionDeUsuario) {
    return this.solicitudes.listar(peticion.usuarioId);
  }

  @Post(':id/accept')
  @HttpCode(200)
  aceptar(
    @Param('id', idDeSolicitud) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.solicitudes.responder(id, peticion.usuarioId, true);
  }

  @Post(':id/reject')
  @HttpCode(200)
  rechazar(
    @Param('id', idDeSolicitud) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.solicitudes.responder(id, peticion.usuarioId, false);
  }
}
