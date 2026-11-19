import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ViajeRepo } from './viaje.repo.js';
import { CreateViajeDto } from './dto/create-viaje.dto.js';

// reglas para publicar un viaje (POST /driver/trips)
@Injectable()
export class ViajeService {
  constructor(private readonly viajeRepo: ViajeRepo) {}

  async crear(conductorId: number, dto: CreateViajeDto) {
    // primero las reglas que no necesitan la base de datos
    this.validarRuta(dto);
    if (dto.fechaHoraSalida.getTime() <= Date.now()) {
      throw new BadRequestException('La fecha de salida debe ser futura.');
    }

    // el usuario debe existir, estar activo y ser conductor
    const conductor = await this.viajeRepo.buscarConductor(conductorId);
    if (!conductor || !conductor.activo) {
      throw new NotFoundException('El usuario no existe o está inactivo.');
    }
    if (!conductor.esConductor) {
      throw new ForbiddenException(
        'Debes registrar un vehículo para publicar viajes.',
      );
    }

    // el vehículo debe ser del conductor, estar activo y tener espacio para los cupos
    const vehiculo = await this.viajeRepo.buscarVehiculo(dto.vehiculoId);
    if (!vehiculo || vehiculo.usuarioId !== conductorId) {
      // un vehículo ajeno se reporta igual que uno inexistente
      throw new NotFoundException('El vehículo no existe.');
    }
    if (!vehiculo.activo) {
      throw new BadRequestException(
        'Solo puedes publicar viajes con tu vehículo activo.',
      );
    }
    if (dto.cuposTotales > vehiculo.capacidadPasajeros) {
      throw new BadRequestException(
        `El vehículo solo admite ${vehiculo.capacidadPasajeros} pasajeros.`,
      );
    }

    // el método de pago debe existir en el catálogo y estar activo
    const metodoPago = await this.viajeRepo.buscarMetodoPago(dto.metodoPagoId);
    if (!metodoPago || !metodoPago.activo) {
      throw new BadRequestException(
        'El método de pago no existe o no está disponible.',
      );
    }

    return this.viajeRepo.crear({
      conductorId,
      vehiculoId: dto.vehiculoId,
      metodoPagoId: dto.metodoPagoId,
      origenNombre: dto.origenNombre,
      origenLat: String(dto.origenLat),
      origenLng: String(dto.origenLng),
      destinoNombre: dto.destinoNombre,
      destinoLat: String(dto.destinoLat),
      destinoLng: String(dto.destinoLng),
      rutaPolyline: dto.rutaPolyline,
      fechaHoraSalida: dto.fechaHoraSalida,
      cuposTotales: dto.cuposTotales,
      costo: dto.costo.toFixed(2),
    });
  }

  // el origen y el destino no pueden ser el mismo lugar, ni por nombre ni por coordenadas
  private validarRuta(dto: CreateViajeDto) {
    const mismoNombre =
      dto.origenNombre.toLowerCase() === dto.destinoNombre.toLowerCase();
    const mismasCoordenadas =
      dto.origenLat === dto.destinoLat && dto.origenLng === dto.destinoLng;

    if (mismoNombre || mismasCoordenadas) {
      throw new BadRequestException(
        'El origen y el destino deben ser diferentes.',
      );
    }
  }
}
