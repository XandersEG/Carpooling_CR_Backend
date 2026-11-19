import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../database/queries.js';
import {
  catalogoMetodoDePagoTable,
  usuarioTable,
  vehiculoTable,
  viajeTable,
} from '../database/schemas.js';

// the "?? null" returns below are typed explicitly: indexing a query result
// is typed as always present, but the row may not exist
type Conductor = { id: number; esConductor: boolean; activo: boolean };
type Vehiculo = {
  id: number;
  usuarioId: number;
  activo: boolean;
  capacidadPasajeros: number;
};
type MetodoPago = { id: number; activo: boolean };

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

// acceso a datos para publicar viajes; las reglas de negocio viven en ViajeService
@Injectable()
export class ViajeRepo {
  async buscarConductor(conductorId: number): Promise<Conductor | null> {
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

  // vehículo con su dueño, para que el servicio revise propiedad, estado y capacidad
  async buscarVehiculo(vehiculoId: number): Promise<Vehiculo | null> {
    const [vehiculo] = await db
      .select({
        id: vehiculoTable.id,
        usuarioId: vehiculoTable.usuarioId,
        activo: vehiculoTable.activo,
        capacidadPasajeros: vehiculoTable.capacidadPasajeros,
      })
      .from(vehiculoTable)
      .where(eq(vehiculoTable.id, vehiculoId));

    return vehiculo ?? null;
  }

  async buscarMetodoPago(metodoPagoId: number): Promise<MetodoPago | null> {
    const [metodo] = await db
      .select({
        id: catalogoMetodoDePagoTable.id,
        activo: catalogoMetodoDePagoTable.activo,
      })
      .from(catalogoMetodoDePagoTable)
      .where(eq(catalogoMetodoDePagoTable.id, metodoPagoId));

    return metodo ?? null;
  }

  // el viaje nace programado (sin inicio, fin ni cancelación) y con todos sus cupos libres
  async crear(datos: DatosViaje) {
    const [viaje] = await db
      .insert(viajeTable)
      .values({ ...datos, cuposDisponibles: datos.cuposTotales })
      .returning();

    return viaje;
  }
}
