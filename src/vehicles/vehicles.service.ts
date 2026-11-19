
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { VehiculoRepo } from './vehiculo.repo.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

function codigoPostgres(error: unknown): string | undefined {
  const e = error as {
    code?: string;
    cause?: { code?: string };
  } | null;

  return e?.cause?.code ?? e?.code;
}

@Injectable()
export class VehiclesService {
  constructor(private readonly vehiculoRepo: VehiculoRepo) {}

  // Listar los vehículos del conductor
  listar(usuarioId: number) {
    return this.vehiculoRepo.listar(usuarioId);
  }

  // Consultar un vehículo específico
  async buscarPorId(id: number, usuarioId: number) {
    const vehiculo = await this.vehiculoRepo.buscarPorId(
      id,
      usuarioId,
    );

    if (!vehiculo) {
      throw new NotFoundException('El vehículo no existe.');
    }

    return vehiculo;
  }

  // Registrar un vehículo
  async crear(usuarioId: number, dto: CreateVehicleDto) {
    const existente = await this.vehiculoRepo.buscarPorPlaca(
      dto.placa,
    );

    if (existente) {
      throw new ConflictException(
        'Ya existe un vehículo registrado con esa placa.',
      );
    }

    try {
      return await this.vehiculoRepo.crear(usuarioId, dto);
    } catch (error) {
      if (codigoPostgres(error) === '23505') {
        throw new ConflictException(
          'Ya existe un vehículo registrado con esa placa.',
        );
      }

      throw error;
    }
  }

  // Actualizar los datos de un vehículo
  async actualizar(
    id: number,
    usuarioId: number,
    dto: UpdateVehicleDto,
  ) {
    const vehiculo = await this.buscarPorId(id, usuarioId);

    if (Object.values(dto).every((valor) => valor === undefined)) {
      throw new BadRequestException(
        'Debes indicar al menos un campo para actualizar.',
      );
    }

    // Comprobar que la nueva placa no pertenezca a otro vehículo
    if (dto.placa && dto.placa !== vehiculo.placa) {
      const existente = await this.vehiculoRepo.buscarPorPlaca(
        dto.placa,
      );

      if (existente && existente.id !== id) {
        throw new ConflictException(
          'Ya existe un vehículo registrado con esa placa.',
        );
      }
    }

    try {
      const actualizado = await this.vehiculoRepo.actualizar(
        id,
        usuarioId,
        dto,
      );

      if (!actualizado) {
        throw new NotFoundException('El vehículo no existe.');
      }

      return actualizado;
    } catch (error) {
      if (codigoPostgres(error) === '23505') {
        throw new ConflictException(
          'Ya existe un vehículo registrado con esa placa.',
        );
      }

      throw error;
    }
  }

  // Eliminar un vehículo del conductor
  async eliminar(id: number, usuarioId: number) {
    try {
      const vehiculo = await this.vehiculoRepo.eliminar(
        id,
        usuarioId,
      );

      if (!vehiculo) {
        throw new NotFoundException('El vehículo no existe.');
      }

      return;
    } catch (error) {
      if (codigoPostgres(error) === '23503') {
        throw new ConflictException(
          'No se puede eliminar el vehículo porque tiene viajes asociados.',
        );
      }

      throw error;
    }
  }

  // Activar el vehículo seleccionado
  async activar(id: number, usuarioId: number) {
    const vehiculo = await this.vehiculoRepo.activar(
      id,
      usuarioId,
    );

    if (!vehiculo) {
      throw new NotFoundException('El vehículo no existe.');
    }

    return vehiculo;
  }
}
