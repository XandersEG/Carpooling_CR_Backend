import { eq, inArray } from 'drizzle-orm';
import { db } from '../database/queries.js';
import {
  catalogoMetodoDePagoTable,
  catalogoOpcionesDeGenero,
  institucionTable,
  usuarioTable,
  vehiculoTable,
  viajeTable,
} from '../database/schemas.js';

// viajes con lo que muestran "Mis Viajes" y su resumen, en una sola consulta. autor: Wes, 2026-11-18
export async function buscarViajesParaPasajero(viajeIds: number[]) {
  if (viajeIds.length === 0) {
    return [];
  }
  return db
    .select({
      viaje: viajeTable,
      metodoPago: catalogoMetodoDePagoTable.nombre,
      conductorNombre: usuarioTable.nombre,
      conductorApellidos: usuarioTable.apellidos,
      conductorFoto: usuarioTable.fotoUrl,
      tokenVerificacion: usuarioTable.tokenVerificacion,
      genero: catalogoOpcionesDeGenero.nombre,
      institucion: institucionTable.nombre,
      institucionActiva: institucionTable.activo,
      marca: vehiculoTable.marca,
      modelo: vehiculoTable.modelo,
      color: vehiculoTable.color,
      placa: vehiculoTable.placa,
      capacidad: vehiculoTable.capacidadPasajeros,
    })
    .from(viajeTable)
    .innerJoin(usuarioTable, eq(viajeTable.conductorId, usuarioTable.id))
    .innerJoin(vehiculoTable, eq(viajeTable.vehiculoId, vehiculoTable.id))
    .innerJoin(
      catalogoMetodoDePagoTable,
      eq(viajeTable.metodoPagoId, catalogoMetodoDePagoTable.id),
    )
    .innerJoin(
      catalogoOpcionesDeGenero,
      eq(usuarioTable.generoId, catalogoOpcionesDeGenero.id),
    )
    .innerJoin(
      institucionTable,
      eq(usuarioTable.institucionId, institucionTable.id),
    )
    .where(inArray(viajeTable.id, viajeIds));
}
