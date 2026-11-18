
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import type { Request } from 'express';

import { VehiclesService } from './vehicles.service.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

type PeticionDeUsuario = Request & {
  usuarioId?: number;
};

@Controller('vehicles')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  // Obtener el identificador del usuario autenticado
  private obtenerUsuarioId(peticion: PeticionDeUsuario): number {
    const usuarioId = peticion.usuarioId;

    if (
      typeof usuarioId !== 'number' ||
      !Number.isSafeInteger(usuarioId) ||
      usuarioId <= 0
    ) {
      throw new UnauthorizedException(
        'Debes iniciar sesión para gestionar tus vehículos.',
      );
    }

    return usuarioId;
  }

  // GET /api/vehicles
  @Get()
  listar(@Req() peticion: PeticionDeUsuario) {
    const usuarioId = this.obtenerUsuarioId(peticion);

    return this.vehiclesService.listar(usuarioId);
  }

  // GET /api/vehicles/:id
  @Get(':id')
  buscarPorId(
    @Param('id', ParseIntPipe) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    const usuarioId = this.obtenerUsuarioId(peticion);

    return this.vehiclesService.buscarPorId(id, usuarioId);
  }

  // POST /api/vehicles
  @Post()
  crear(
    @Body() dto: CreateVehicleDto,
    @Req() peticion: PeticionDeUsuario,
  ) {
    const usuarioId = this.obtenerUsuarioId(peticion);

    return this.vehiclesService.crear(usuarioId, dto);
  }

  // PATCH /api/vehicles/:id
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
    @Req() peticion: PeticionDeUsuario,
  ) {
    const usuarioId = this.obtenerUsuarioId(peticion);

    return this.vehiclesService.actualizar(id, usuarioId, dto);
  }

  // DELETE /api/vehicles/:id
  @Delete(':id')
  @HttpCode(204)
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    const usuarioId = this.obtenerUsuarioId(peticion);

    return this.vehiclesService.eliminar(id, usuarioId);
  }

  // PATCH /api/vehicles/:id/activate
  @Patch(':id/activate')
  activar(
    @Param('id', ParseIntPipe) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    const usuarioId = this.obtenerUsuarioId(peticion);

    return this.vehiclesService.activar(id, usuarioId);
  }
}
