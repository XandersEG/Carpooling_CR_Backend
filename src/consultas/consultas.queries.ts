import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  sql,
} from 'drizzle-orm';
import { db } from '../database/queries.js';
import {
  institucionTable,
  solicitudViajeTable,
  usuarioTable,
  viajeTable,
} from '../database/schemas.js';

// consultas generales del portal administrativo.

export type FiltrosConsulta = {
  institucionId?: number;
  desde?: string;
  hasta?: string;
};

// viajes que ya terminaron y no se cancelaron
function viajeFinalizado({ institucionId, desde, hasta }: FiltrosConsulta) {
  return and(
    isNotNull(viajeTable.fechaFinReal),
    isNull(viajeTable.motivoCancelacion),
    desde ? gte(viajeTable.fechaHoraSalida, sql`${desde}::date`) : undefined,
    hasta ? lt(viajeTable.fechaHoraSalida, sql`${hasta}::date + 1`) : undefined,
    institucionId ? eq(usuarioTable.institucionId, institucionId) : undefined,
  );
}


const nombreDePunto = sql<string>`btrim(${solicitudViajeTable.puntoRecogidaNombre})`;


// solicitudes aceptadas de viajes finalizados, con el conductor y su institución.
function recogidasDeViajes(filtros: FiltrosConsulta) {
  return db
    .select({
      punto: nombreDePunto.as('punto'),
      institucionId: usuarioTable.institucionId,
      institucion: institucionTable.nombre,
      viajes: countDistinct(viajeTable.id).as('viajes'),
    })
    .from(solicitudViajeTable)
    .innerJoin(viajeTable, eq(viajeTable.id, solicitudViajeTable.viajeId))
    .innerJoin(usuarioTable, eq(usuarioTable.id, viajeTable.conductorId))
    .innerJoin(
      institucionTable,
      eq(institucionTable.id, usuarioTable.institucionId),
    )
    .where(
      and(
        isNotNull(solicitudViajeTable.fechaRespuesta),
        eq(solicitudViajeTable.respuesta, true),
        viajeFinalizado(filtros),
      ),
    )
    .groupBy(
      nombreDePunto,
      usuarioTable.institucionId,
      institucionTable.nombre,
    );
}

// los puntos de recogida con más viajes, de mayor a menor.
export async function puntosMasConcurrentes(
  filtros: FiltrosConsulta,
  top: number,
) {
  const porPunto = recogidasDeViajes(filtros).as('pp');
  const total = sql<number>`sum(${porPunto.viajes})::int`;
  const masFrecuente = <T>(
    columna: typeof porPunto.institucionId | typeof porPunto.institucion,
  ) =>
    sql<T>`(array_agg(${columna} order by ${porPunto.viajes} desc, ${porPunto.institucionId}))[1]`;

  return db
    .select({
      nombre: porPunto.punto,
      institucionId: masFrecuente<number>(porPunto.institucionId),
      institucion: masFrecuente<string>(porPunto.institucion),
      viajes: total,
    })
    .from(porPunto)
    .groupBy(porPunto.punto)
    .orderBy(desc(total), asc(porPunto.punto))
    .limit(top);
}

// cuántos puntos distintos tienen al menos un viaje en el rango 
export async function contarPuntosConRegistros(filtros: FiltrosConsulta) {
  const [fila] = await db
    .select({ total: countDistinct(nombreDePunto) })
    .from(solicitudViajeTable)
    .innerJoin(viajeTable, eq(viajeTable.id, solicitudViajeTable.viajeId))
    .innerJoin(usuarioTable, eq(usuarioTable.id, viajeTable.conductorId))
    .where(
      and(
        isNotNull(solicitudViajeTable.fechaRespuesta),
        eq(solicitudViajeTable.respuesta, true),
        viajeFinalizado(filtros),
      ),
    );
  return fila.total;
}

// cuántos viajes finalizaron en el rango, tengan o no pasajeros.
export async function contarViajesFinalizados(filtros: FiltrosConsulta) {
  const [fila] = await db
    .select({ total: countDistinct(viajeTable.id) })
    .from(viajeTable)
    .innerJoin(usuarioTable, eq(usuarioTable.id, viajeTable.conductorId))
    .where(viajeFinalizado(filtros));
  return fila.total;
}