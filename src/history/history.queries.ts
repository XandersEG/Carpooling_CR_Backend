import { and, desc, eq, inArray, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../database/queries.js';
import {
  catalogoMetodoDePagoTable,
  catalogoOpcionesDeGenero,
  institucionTable,
  solicitudViajeTable,
  usuarioTable,
  vehiculoTable,
  viajeTable,
} from '../database/schemas.js';

// consultas del "Historial de viajes": viajes que ya terminaron (finalizados o cancelados)

const estadoViaje = sql<'FINALIZADO' | 'CANCELADO'>`CASE
  WHEN ${viajeTable.motivoCancelacion} IS NOT NULL THEN 'CANCELADO'
  ELSE 'FINALIZADO'
END`;

/** El viaje ya terminó: finalizado o cancelado. */
const viajeTerminado = or(
  isNotNull(viajeTable.fechaFinReal),
  isNotNull(viajeTable.motivoCancelacion),
) as SQL;

const conductor = alias(usuarioTable, 'conductor');

/** Columnas del viaje que comparten las dos vistas del historial. */
const columnasViaje = {
  viaje: viajeTable,
  estado: estadoViaje,
  metodoPago: catalogoMetodoDePagoTable.nombre,
  conductorNombre: conductor.nombre,
  conductorApellidos: conductor.apellidos,
  conductorFoto: conductor.fotoUrl,
  conductorGenero: catalogoOpcionesDeGenero.nombre,
  conductorInstitucion: institucionTable.nombre,
  marca: vehiculoTable.marca,
  modelo: vehiculoTable.modelo,
  color: vehiculoTable.color,
  placa: vehiculoTable.placa,
  capacidad: vehiculoTable.capacidadPasajeros,
};

function consultaViajes() {
  return db
    .select(columnasViaje)
    .from(viajeTable)
    .innerJoin(conductor, eq(viajeTable.conductorId, conductor.id))
    .innerJoin(vehiculoTable, eq(viajeTable.vehiculoId, vehiculoTable.id))
    .innerJoin(
      catalogoMetodoDePagoTable,
      eq(viajeTable.metodoPagoId, catalogoMetodoDePagoTable.id),
    )
    .innerJoin(catalogoOpcionesDeGenero, eq(conductor.generoId, catalogoOpcionesDeGenero.id))
    .innerJoin(institucionTable, eq(conductor.institucionId, institucionTable.id));
}

export type FilaViaje = Awaited<ReturnType<typeof viajesTerminadosDeConductor>>[number];

/** Viajes terminados que publicó el conductor. Con `viajeId` devuelve solo ese. */
export function viajesTerminadosDeConductor(conductorId: number, viajeId?: number) {
  return consultaViajes()
    .where(
      and(
        eq(viajeTable.conductorId, conductorId),
        viajeTerminado,
        viajeId === undefined ? undefined : eq(viajeTable.id, viajeId),
      ),
    )
    .orderBy(desc(viajeTable.fechaHoraSalida));
}

/**
 * Viajes terminados en los que el usuario fue pasajero aceptado, con su
 * solicitud. Con `solicitudId` devuelve solo esa.
 */
export async function viajesTerminadosDePasajero(pasajeroId: number, solicitudId?: number) {
  const filas = await db
    .select({
      ...columnasViaje,
      solicitudId: solicitudViajeTable.id,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
      puntoRecogidaLat: solicitudViajeTable.puntoRecogidaLat,
      puntoRecogidaLng: solicitudViajeTable.puntoRecogidaLng,
    })
    .from(solicitudViajeTable)
    .innerJoin(viajeTable, eq(solicitudViajeTable.viajeId, viajeTable.id))
    .innerJoin(conductor, eq(viajeTable.conductorId, conductor.id))
    .innerJoin(vehiculoTable, eq(viajeTable.vehiculoId, vehiculoTable.id))
    .innerJoin(
      catalogoMetodoDePagoTable,
      eq(viajeTable.metodoPagoId, catalogoMetodoDePagoTable.id),
    )
    .innerJoin(catalogoOpcionesDeGenero, eq(conductor.generoId, catalogoOpcionesDeGenero.id))
    .innerJoin(institucionTable, eq(conductor.institucionId, institucionTable.id))
    .where(
      and(
        eq(solicitudViajeTable.pasajeroId, pasajeroId),
        isNotNull(solicitudViajeTable.fechaRespuesta),
        eq(solicitudViajeTable.respuesta, true),
        viajeTerminado,
        solicitudId === undefined ? undefined : eq(solicitudViajeTable.id, solicitudId),
      ),
    )
    .orderBy(desc(viajeTable.fechaHoraSalida));
  return filas;
}

/** Pasajeros aceptados de varios viajes, en una sola consulta. */
export function pasajerosAceptados(viajeIds: number[]) {
  if (viajeIds.length === 0) return Promise.resolve([]);
  return db
    .select({
      viajeId: solicitudViajeTable.viajeId,
      solicitudId: solicitudViajeTable.id,
      pasajeroId: usuarioTable.id,
      nombre: usuarioTable.nombre,
      apellidos: usuarioTable.apellidos,
      fotoUrl: usuarioTable.fotoUrl,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
    })
    .from(solicitudViajeTable)
    .innerJoin(usuarioTable, eq(solicitudViajeTable.pasajeroId, usuarioTable.id))
    .where(
      and(
        inArray(solicitudViajeTable.viajeId, viajeIds),
        isNotNull(solicitudViajeTable.fechaRespuesta),
        eq(solicitudViajeTable.respuesta, true),
      ),
    )
    .orderBy(solicitudViajeTable.fechaRespuesta);
}
