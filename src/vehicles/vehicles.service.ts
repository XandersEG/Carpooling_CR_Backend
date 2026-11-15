import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import { vehiculoTable } from '../database/schemas.js';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly database: DatabaseService,
  ) {}

  async findAllByUser(usuarioId: number) {
    const vehicles = await this.database.db
      .select({
        id: vehiculoTable.id,
        placa: vehiculoTable.placa,
        marca: vehiculoTable.marca,
        modelo: vehiculoTable.modelo,
        color: vehiculoTable.color,
        capacidadPasajeros: vehiculoTable.capacidadPasajeros,
        activo: vehiculoTable.activo,
      })
      .from(vehiculoTable)
      .where(
        and(
          eq(vehiculoTable.usuarioId, usuarioId),
          eq(vehiculoTable.activo, true),
        ),
      );

    return vehicles.map((vehicle) => ({
      ...vehicle,

      nombre: `${vehicle.marca} ${vehicle.modelo}`,
    }));
  }

  async remove(id: number, usuarioId: number) {
    const [vehicle] = await this.database.db
      .select({
        id: vehiculoTable.id,
      })
      .from(vehiculoTable)
      .where(
        and(
          eq(vehiculoTable.id, id),
          eq(vehiculoTable.usuarioId, usuarioId),
          eq(vehiculoTable.activo, true),
        ),
      )
      .limit(1);

    if (!vehicle) {
      throw new NotFoundException(
        'Vehículo no encontrado',
      );
    }

    await this.database.db
      .update(vehiculoTable)
      .set({
        activo: false,
      })
      .where(
        and(
          eq(vehiculoTable.id, id),
          eq(vehiculoTable.usuarioId, usuarioId),
        ),
      );

    return {
      message: 'Vehículo eliminado correctamente',
    };
  }
}