import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { IdPipe } from '../common/pipes/id.pipe.js';
import { GuardarVehiculoDto } from './dto/guardar-vehiculo.dto.js';
import { VehiculosService } from './vehiculos.service.js';

/**
 * Vehículos de un usuario conductor.
 *
 * Todavía no hay autenticación en el backend, por eso el usuario viaja en la
 * ruta. Cuando exista un guard, `:usuarioId` se reemplaza por el usuario de la sesión.
 */
@Controller('usuarios/:usuarioId/vehiculos')
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

  /** "Mis vehículos". */
  @Get()
  listar(@Param('usuarioId', IdPipe) usuarioId: number) {
    return this.vehiculosService.listar(usuarioId);
  }

  /** Carga "Datos del vehículo" al editar. */
  @Get(':vehiculoId')
  obtener(
    @Param('usuarioId', IdPipe) usuarioId: number,
    @Param('vehiculoId', IdPipe) vehiculoId: number,
  ) {
    return this.vehiculosService.obtener(usuarioId, vehiculoId);
  }

  /** "Agregar vehículo" → "Guardar datos". */
  @Post()
  crear(
    @Param('usuarioId', IdPipe) usuarioId: number,
    @Body() cuerpo: GuardarVehiculoDto,
  ) {
    return this.vehiculosService.crear(usuarioId, cuerpo);
  }

  /** "Datos del vehículo" → "Guardar datos". Reemplaza todos los campos editables. */
  @Put(':vehiculoId')
  actualizar(
    @Param('usuarioId', IdPipe) usuarioId: number,
    @Param('vehiculoId', IdPipe) vehiculoId: number,
    @Body() cuerpo: GuardarVehiculoDto,
  ) {
    return this.vehiculosService.actualizar(usuarioId, vehiculoId, cuerpo);
  }

  /** "¿Eliminar vehículo?" → "Eliminar". */
  @Delete(':vehiculoId')
  @HttpCode(204)
  eliminar(
    @Param('usuarioId', IdPipe) usuarioId: number,
    @Param('vehiculoId', IdPipe) vehiculoId: number,
  ) {
    return this.vehiculosService.eliminar(usuarioId, vehiculoId);
  }
}
