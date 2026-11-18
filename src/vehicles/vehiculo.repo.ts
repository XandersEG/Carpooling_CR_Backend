
import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../database/queries.js';
import { usuarioTable, vehiculoTable } from '../database/schemas.js';

export type DatosVehiculo = Pick<
  typeof vehiculoTable.$inferInsert,
  'placa' | 'marca' | 'modelo' | 'color' | 'capacidadPasajeros'
>;

@Injectable()
export class VehiculoRepo {

  // Listar todos los vehículos de un conductor
  listar(usuarioId: number) {
    return db
      .select()
      .from(vehiculoTable)
      .where(eq(vehiculoTable.usuarioId, usuarioId))
      .orderBy(asc(vehiculoTable.id));
  }

  // Buscar un vehículo que pertenezca al conductor
  async buscarPorId(id: number, usuarioId: number) {
    const [vehiculo] = await db
      .select()
      .from(vehiculoTable)
      .where(
        and(
          eq(vehiculoTable.id, id),
          eq(vehiculoTable.usuarioId, usuarioId),
        ),
      );

    return vehiculo ?? null;
  }

  // Buscar un vehículo por su placa
  async buscarPorPlaca(placa: string) {
    const [vehiculo] = await db
      .select()
      .from(vehiculoTable)
      .where(eq(vehiculoTable.placa, placa.trim().toUpperCase()));

    return vehiculo ?? null;
  }

  // Registrar un vehículo
  async crear(usuarioId: number, datos: DatosVehiculo) {
    return db.transaction(async (tx) => {
      // Bloquear el usuario mientras se registra el vehículo
      await tx
        .select({ id: usuarioTable.id })
        .from(usuarioTable)
        .where(eq(usuarioTable.id, usuarioId))
        .for('update');

      const [activo] = await tx
        .select({ id: vehiculoTable.id })
        .from(vehiculoTable)
        .where(
          and(
            eq(vehiculoTable.usuarioId, usuarioId),
            eq(vehiculoTable.activo, true),
          ),
        )
        .limit(1);

      const [vehiculo] = await tx
        .insert(vehiculoTable)
        .values({
          ...datos,
          usuarioId,
          placa: datos.placa.trim().toUpperCase(),
          activo: !activo,
        })
        .returning();

      await tx
        .update(usuarioTable)
        .set({ esConductor: true })
        .where(eq(usuarioTable.id, usuarioId));

      return vehiculo;
    });
  }

  // Actualizar los datos de un vehículo
  async actualizar(
    id: number,
    usuarioId: number,
    datos: Partial<DatosVehiculo>,
  ) {
    const [vehiculo] = await db
      .update(vehiculoTable)
      .set({
        ...datos,
        placa: datos.placa?.trim().toUpperCase(),
      })
      .where(
        and(
          eq(vehiculoTable.id, id),
          eq(vehiculoTable.usuarioId, usuarioId),
        ),
      )
      .returning();

    return vehiculo ?? null;
  }

  // Eliminar un vehículo
  async eliminar(id: number, usuarioId: number) {
    const [vehiculo] = await db
      .delete(vehiculoTable)
      .where(
        and(
          eq(vehiculoTable.id, id),
          eq(vehiculoTable.usuarioId, usuarioId),
        ),
      )
      .returning();

    return vehiculo ?? null;
  }

  // Marcar un vehículo como activo
  async activar(id: number, usuarioId: number) {
    return db.transaction(async (tx) => {
      // Evitar activaciones simultáneas del mismo conductor
      await tx
        .select({ id: usuarioTable.id })
        .from(usuarioTable)
        .where(eq(usuarioTable.id, usuarioId))
        .for('update');

      const [vehiculo] = await tx
        .select()
        .from(vehiculoTable)
        .where(
          and(
            eq(vehiculoTable.id, id),
            eq(vehiculoTable.usuarioId, usuarioId),
          ),
        );

      if (!vehiculo) return null;

      // Desactivar los demás vehículos del conductor
      await tx
        .update(vehiculoTable)
        .set({ activo: false })
        .where(eq(vehiculoTable.usuarioId, usuarioId));

      // Activar únicamente el vehículo seleccionado
      const [actualizado] = await tx
        .update(vehiculoTable)
        .set({ activo: true })
        .where(
          and(
            eq(vehiculoTable.id, id),
            eq(vehiculoTable.usuarioId, usuarioId),
          ),
        )
        .returning();

      return actualizado ?? null;
    });
  }
}
