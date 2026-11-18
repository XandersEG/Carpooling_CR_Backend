
import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import type { Request } from 'express';
import { ViajeService } from './viaje.service.js';
import { CreateViajeDto } from './dto/create-viaje.dto.js';

type PeticionDeUsuario = Request & {
  usuarioId?: number;
};

@Controller('viajes')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ViajeController {
  constructor(private readonly viajeService: ViajeService) {}

  private obtenerUsuarioId(peticion: PeticionDeUsuario): number {
    const usuarioId = peticion.usuarioId;

    if (
      typeof usuarioId !== 'number' ||
      !Number.isSafeInteger(usuarioId) ||
      usuarioId <= 0
    ) {
      throw new UnauthorizedException('Debes iniciar sesión para publicar un viaje.');
    }

    return usuarioId;
  }

  @Post()
  crear(
    @Body() dto: CreateViajeDto,
    @Req() peticion: PeticionDeUsuario,
  ) {
    const conductorId = this.obtenerUsuarioId(peticion);

    return this.viajeService.crear(conductorId, dto);
  }

  // @UseGuards(JwtAuthGuard)
}
