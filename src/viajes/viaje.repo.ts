
import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { db, crearViaje } from '../database/queries.js';
import {
  usuarioTable,
  viajeTable,
} from '../database/schemas.js';

export type DatosViaje = {
  conductorId: number;
  vehiculoId: number;
  metodoPagoId: number;
  origenNombre: string;
  origenLat: string;
  origenLng: string;
  destinoNombre: string;
  destinoLat: string;
  destinoLng: string;
  rutaPolyline?: string;
  fechaHoraSalida: Date;
  cuposTotales: number;
  costo: string;
};

@Injectable()
export class ViajeRepo {
  async buscarConductor(conductorId: number) {
    const [conductor] = await db
      .select({
        id: usuarioTable.id,
        esConductor: usuarioTable.esConductor,
        activo: usuarioTable.activo,
      })
      .from(usuarioTable)
      .where(eq(usuarioTable.id, conductorId));

    return conductor ?? null;
  }

  async crear(datos: DatosViaje) {
    return crearViaje(datos);
  }

  async buscarPorId(id: number) {
    const [viaje] = await db
      .select()
      .from(viajeTable)
      .where(eq(viajeTable.id, id));

    return viaje ?? null;
  }
}
