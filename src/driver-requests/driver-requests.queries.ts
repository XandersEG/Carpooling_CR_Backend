import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { db } from '../database/queries.js';
import {
  solicitudViajeTable,
  usuarioTable,
  viajeTable,
} from '../database/schemas.js';

export function buscarSolicitudesDeConductor(conductorId: number) {
  return db
    .select({
      id: solicitudViajeTable.id,
      fechaRespuesta: solicitudViajeTable.fechaRespuesta,
      pasajeroId: usuarioTable.id,
      nombre: usuarioTable.nombre,
      apellidos: usuarioTable.apellidos,
      fotoUrl: usuarioTable.fotoUrl,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
      puntoRecogidaLat: solicitudViajeTable.puntoRecogidaLat,
      puntoRecogidaLng: solicitudViajeTable.puntoRecogidaLng,
      viajeId: viajeTable.id,
      origen: viajeTable.origenNombre,
      destino: viajeTable.destinoNombre,
      salida: viajeTable.fechaHoraSalida,
      costo: viajeTable.costo,
    })
    .from(solicitudViajeTable)
    .innerJoin(viajeTable, eq(solicitudViajeTable.viajeId, viajeTable.id))
    .innerJoin(
      usuarioTable,
      eq(solicitudViajeTable.pasajeroId, usuarioTable.id),
    )
    .where(
      and(
        eq(viajeTable.conductorId, conductorId),
        isNull(viajeTable.fechaInicioReal),
        isNull(viajeTable.fechaFinReal),
        isNull(viajeTable.motivoCancelacion),
        or(
          isNull(solicitudViajeTable.fechaRespuesta),
          eq(solicitudViajeTable.respuesta, true),
        ),
      ),
    )
    .orderBy(
      asc(viajeTable.fechaHoraSalida),
      asc(solicitudViajeTable.fechaSolicitud),
    );
}
