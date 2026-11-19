import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';

import { validacion } from '../admin/validacion.js';
import { UserGuard, type PeticionDeUsuario } from '../auth/user.guard.js';
import { VehiclesService } from './vehicles.service.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

const idDeVehiculo = new ParseIntPipe({
  exceptionFactory: () =>
    new NotFoundException('El vehículo no existe.'),
});

@Controller('driver/vehicles')
@UseGuards(UserGuard)
@UsePipes(validacion)
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
  ) {}

  // GET /api/driver/vehicles
  @Get()
  listar(@Req() peticion: PeticionDeUsuario) {
    return this.vehiclesService.listar(
      peticion.usuarioId,
    );
  }

  // GET /api/driver/vehicles/:id
  @Get(':id')
  buscarPorId(
    @Param('id', idDeVehiculo) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.vehiclesService.buscarPorId(
      id,
      peticion.usuarioId,
    );
  }

  // POST /api/driver/vehicles
  @Post()
  crear(
    @Body() dto: CreateVehicleDto,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.vehiclesService.crear(
      peticion.usuarioId,
      dto,
    );
  }

  // PATCH /api/driver/vehicles/:id
  @Patch(':id')
  actualizar(
    @Param('id', idDeVehiculo) id: number,
    @Body() dto: UpdateVehicleDto,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.vehiclesService.actualizar(
      id,
      peticion.usuarioId,
      dto,
    );
  }

  // DELETE /api/driver/vehicles/:id
  @Delete(':id')
  @HttpCode(204)
  eliminar(
    @Param('id', idDeVehiculo) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.vehiclesService.eliminar(
      id,
      peticion.usuarioId,
    );
  }

  // PATCH /api/driver/vehicles/:id/activate
  @Patch(':id/activate')
  activar(
    @Param('id', idDeVehiculo) id: number,
    @Req() peticion: PeticionDeUsuario,
  ) {
    return this.vehiclesService.activar(
      id,
      peticion.usuarioId,
    );
  }
}