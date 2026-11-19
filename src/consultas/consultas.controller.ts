import { Controller, Get, Query, UseGuards, UsePipes } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard.js';
import { ConsultasService } from './consultas.service.js';
import {
  PuntosConcurrentesDto,
  UsuariosNuevosDto,
} from './dto/consultas.dto.js';
import { validacion } from '../admin/validacion.js';

@Controller('admin/consultas')
@UseGuards(AdminGuard)
@UsePipes(validacion)
export class ConsultasController {
  constructor(private readonly consultas: ConsultasService) {}

  @Get('puntos-concurrentes')
  puntosConcurrentes(@Query() filtros: PuntosConcurrentesDto) {
    return this.consultas.puntosConcurrentes(filtros);
  }

  @Get('usuarios-nuevos')
  usuariosNuevos(@Query() filtros: UsuariosNuevosDto) {
    return this.consultas.usuariosNuevos(filtros);
  }
}
