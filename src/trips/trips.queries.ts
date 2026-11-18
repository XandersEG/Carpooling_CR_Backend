import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '../database/queries.js';
import {
  solicitudViajeTable,
  usuarioTable,
  viajeTable,
} from '../database/schemas.js';

// cancela un viaje programado o en curso; el motivo es lo que lo marca como cancelado. autor: Wes, 2026-11-18
export async function cancelarViajeActivo(
  viajeId: number,
  conductorId: number,
  motivo: string,
) {
  const [viaje] = await db
    .update(viajeTable)
    .set({ motivoCancelacion: motivo })
    .where(
      and(
        eq(viajeTable.id, viajeId),
        eq(viajeTable.conductorId, conductorId),
        isNull(viajeTable.fechaFinReal),
        isNull(viajeTable.motivoCancelacion),
      ),
    )
    .returning({ id: viajeTable.id });

  if (!viaje) throw new Error('El viaje no existe, no es tuyo o ya terminó');
  return viaje;
}

// pasajeros aceptados de un viaje, con lo que necesitan el conductor y el aviso de cancelación. autor: Wes, 2026-11-18
export function buscarPasajerosDelViaje(viajeId: number) {
  return db
    .select({
      solicitudId: solicitudViajeTable.id,
      pasajeroId: usuarioTable.id,
      nombre: usuarioTable.nombre,
      apellidos: usuarioTable.apellidos,
      correo: usuarioTable.correoInstitucional,
      fotoUrl: usuarioTable.fotoUrl,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
      puntoRecogidaLat: solicitudViajeTable.puntoRecogidaLat,
      puntoRecogidaLng: solicitudViajeTable.puntoRecogidaLng,
    })
    .from(solicitudViajeTable)
    .innerJoin(
      usuarioTable,
      eq(solicitudViajeTable.pasajeroId, usuarioTable.id),
    )
    .where(
      and(
        eq(solicitudViajeTable.viajeId, viajeId),
        isNotNull(solicitudViajeTable.fechaRespuesta),
        eq(solicitudViajeTable.respuesta, true),
      ),
    )
    .orderBy(asc(solicitudViajeTable.fechaRespuesta));
}
