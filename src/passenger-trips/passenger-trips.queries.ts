import { and, asc, desc, eq, gt, isNull, ne, notExists, sql } from 'drizzle-orm';
import { db } from '../database/queries.js';
import {
  solicitudViajeTable,
  usuarioTable,
  viajeTable,
} from '../database/schemas.js';

// viajes programados con cupo, que no son del usuario y a los que aún no ha pedido unirse
export function buscarViajesDisponibles(pasajeroId: number) {
  return db
    .select({
      id: viajeTable.id,
      origenNombre: viajeTable.origenNombre,
      destinoNombre: viajeTable.destinoNombre,
      salida: viajeTable.fechaHoraSalida,
      cuposDisponibles: viajeTable.cuposDisponibles,
      costo: viajeTable.costo,
      conductorNombre: usuarioTable.nombre,
      conductorApellidos: usuarioTable.apellidos,
      conductorFoto: usuarioTable.fotoUrl,
    })
    .from(viajeTable)
    .innerJoin(usuarioTable, eq(viajeTable.conductorId, usuarioTable.id))
    .where(
      and(
        isNull(viajeTable.fechaInicioReal),
        isNull(viajeTable.fechaFinReal),
        isNull(viajeTable.motivoCancelacion),
        gt(viajeTable.cuposDisponibles, 0),
        gt(viajeTable.fechaHoraSalida, new Date()),
        ne(viajeTable.conductorId, pasajeroId),
        notExists(
          db
            .select({ uno: sql`1` })
            .from(solicitudViajeTable)
            .where(
              and(
                eq(solicitudViajeTable.viajeId, viajeTable.id),
                eq(solicitudViajeTable.pasajeroId, pasajeroId),
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(viajeTable.fechaHoraSalida));
}

// la solicitud que este pasajero ya hizo para el viaje, si existe
export async function buscarSolicitudDelPasajero(
  viajeId: number,
  pasajeroId: number,
) {
  const [solicitud] = await db
    .select({
      id: solicitudViajeTable.id,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
      puntoRecogidaLat: solicitudViajeTable.puntoRecogidaLat,
      puntoRecogidaLng: solicitudViajeTable.puntoRecogidaLng,
      fechaRespuesta: solicitudViajeTable.fechaRespuesta,
      respuesta: solicitudViajeTable.respuesta,
    })
    .from(solicitudViajeTable)
    .where(
      and(
        eq(solicitudViajeTable.viajeId, viajeId),
        eq(solicitudViajeTable.pasajeroId, pasajeroId),
      ),
    )
    .limit(1);
  return solicitud ?? null;
}

export async function crearSolicitud(datos: {
  viajeId: number;
  pasajeroId: number;
  nombre: string;
  lat: number;
  lng: number;
}) {
  const [solicitud] = await db
    .insert(solicitudViajeTable)
    .values({
      viajeId: datos.viajeId,
      pasajeroId: datos.pasajeroId,
      puntoRecogidaNombre: datos.nombre,
      // si tus columnas son numeric, drizzle espera string; si son double, pasa el número
      puntoRecogidaLat: String(datos.lat),
      puntoRecogidaLng: String(datos.lng),
    })
    .returning({ id: solicitudViajeTable.id });
  return solicitud;
}

// todas las solicitudes del pasajero, con el viaje al que pertenecen
export function buscarSolicitudesDelPasajero(pasajeroId: number) {
  return db
    .select({
      solicitudId: solicitudViajeTable.id,
      viajeId: viajeTable.id,
      origenNombre: viajeTable.origenNombre,
      destinoNombre: viajeTable.destinoNombre,
      salida: viajeTable.fechaHoraSalida,
      inicioReal: viajeTable.fechaInicioReal,
      finReal: viajeTable.fechaFinReal,
      motivoCancelacion: viajeTable.motivoCancelacion,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
      puntoRecogidaLat: solicitudViajeTable.puntoRecogidaLat,
      puntoRecogidaLng: solicitudViajeTable.puntoRecogidaLng,
      fechaRespuesta: solicitudViajeTable.fechaRespuesta,
      respuesta: solicitudViajeTable.respuesta,
    })
    .from(solicitudViajeTable)
    .innerJoin(viajeTable, eq(solicitudViajeTable.viajeId, viajeTable.id))
    .where(eq(solicitudViajeTable.pasajeroId, pasajeroId))
    .orderBy(desc(viajeTable.fechaHoraSalida));
}

// la solicitud de un pasajero para un viaje (como mucho una, por el índice único)
export async function buscarSolicitudDePasajero(
  viajeId: number,
  pasajeroId: number,
) {
  const [solicitud] = await db
    .select({
      id: solicitudViajeTable.id,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
      lat: solicitudViajeTable.puntoRecogidaLat,
      lng: solicitudViajeTable.puntoRecogidaLng,
      fechaRespuesta: solicitudViajeTable.fechaRespuesta,
      respuesta: solicitudViajeTable.respuesta,
    })
    .from(solicitudViajeTable)
    .where(
      and(
        eq(solicitudViajeTable.viajeId, viajeId),
        eq(solicitudViajeTable.pasajeroId, pasajeroId),
      ),
    )
    .limit(1);
  return solicitud ?? null;
}