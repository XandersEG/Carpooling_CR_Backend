
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ViajeRepo } from './viaje.repo.js';
import { CreateViajeDto } from './dto/create-viaje.dto.js';

@Injectable()
export class ViajeService {
  constructor(private readonly viajeRepo: ViajeRepo) {}

  async crear(conductorId: number, dto: CreateViajeDto) {
    const conductor = await this.viajeRepo.buscarConductor(conductorId);

    if (!conductor || !conductor.activo) {
      throw new NotFoundException('El usuario no existe o está inactivo.');
    }

    if (!conductor.esConductor) {
      throw new ForbiddenException('El usuario no tiene permiso para publicar viajes.');
    }

    if (dto.origenNombre.trim().toLowerCase() === dto.destinoNombre.trim().toLowerCase()) {
      throw new BadRequestException('El origen y el destino deben ser diferentes.');
    }

    if (
      dto.origenLat === dto.destinoLat &&
      dto.origenLng === dto.destinoLng
    ) {
      throw new BadRequestException('El origen y el destino deben ser diferentes.');
    }

    if (dto.fechaHoraSalida <= new Date()) {
      throw new BadRequestException('La fecha de salida debe ser futura.');
    }

    try {
      const viaje = await this.viajeRepo.crear({
        conductorId,
        vehiculoId: dto.vehiculoId,
        metodoPagoId: dto.metodoPagoId,
        origenNombre: dto.origenNombre.trim(),
        origenLat: String(dto.origenLat),
        origenLng: String(dto.origenLng),
        destinoNombre: dto.destinoNombre.trim(),
        destinoLat: String(dto.destinoLat),
        destinoLng: String(dto.destinoLng),
        rutaPolyline: dto.rutaPolyline,
        fechaHoraSalida: dto.fechaHoraSalida,
        cuposTotales: dto.cuposTotales,
        costo: dto.costo.toFixed(2),
      });

      // const estadoInicial = ESTADO_VIAJE.PROGRAMADO;

      return viaje;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const mensaje = error instanceof Error ? error.message : '';

      if (mensaje.includes('vehículo')) {
        throw new BadRequestException(mensaje);
      }

      if (mensaje.includes('método de pago')) {
        throw new BadRequestException(mensaje);
      }

      if (mensaje.includes('fecha de salida')) {
        throw new BadRequestException(mensaje);
      }

      throw error;
    }
  }
}
