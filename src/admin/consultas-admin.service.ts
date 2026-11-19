import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, gt, gte, ilike, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { db } from '../database/queries.js';
import {
  institucionTable,
  solicitudViajeTable,
  usuarioTable,
  viajeTable,
} from '../database/schemas.js';

type FiltrosMonto = { institucionId?: number; desde?: string; hasta?: string };
type FiltrosTopConductores = {
  top: number;
  institucionId?: number;
  buscar?: string;
};
type FiltrosUsuariosActivos = {
  top: number;
  institucionId?: number;
  buscar?: string;
};

@Injectable()
export class ConsultasAdminService {
  async topConductores(filtros: FiltrosTopConductores) {
    const condiciones = and(
      isNotNull(viajeTable.fechaFinReal),
      isNull(viajeTable.motivoCancelacion),
      filtros.institucionId === undefined
        ? undefined
        : eq(usuarioTable.institucionId, filtros.institucionId),
      filtros.buscar
        ? ilike(
            sql`${usuarioTable.nombre} || ' ' || ${usuarioTable.apellidos}`,
            `%${filtros.buscar}%`,
          )
        : undefined,
    );

    const [conductores, [total]] = await Promise.all([
      db
        .select({
          conductorId: usuarioTable.id,
          conductor: sql<string>`${usuarioTable.nombre} || ' ' || ${usuarioTable.apellidos}`,
          institucion: institucionTable.nombre,
          viajesFinalizados: count(viajeTable.id),
        })
        .from(viajeTable)
        .innerJoin(usuarioTable, eq(viajeTable.conductorId, usuarioTable.id))
        .innerJoin(institucionTable, eq(usuarioTable.institucionId, institucionTable.id))
        .where(condiciones)
        .groupBy(
          usuarioTable.id,
          usuarioTable.nombre,
          usuarioTable.apellidos,
          institucionTable.nombre,
        )
        .orderBy(
          desc(count(viajeTable.id)),
          asc(usuarioTable.nombre),
          asc(usuarioTable.apellidos),
          asc(usuarioTable.id),
        )
        .limit(filtros.top),
      db
        .select({
          total: sql<number>`count(distinct ${usuarioTable.id})::int`,
        })
        .from(viajeTable)
        .innerJoin(usuarioTable, eq(viajeTable.conductorId, usuarioTable.id))
        .where(condiciones),
    ]);

    return { conductores, totalConductores: total?.total ?? 0 };
  }

  async usuariosActivos(filtros: FiltrosUsuariosActivos) {
    const viajesComoConductor = db
      .select({
        usuarioId: viajeTable.conductorId,
        cantidadConductor: sql<number>`count(${viajeTable.id})::int`.as('cantidad_conductor'),
      })
      .from(viajeTable)
      .where(and(isNotNull(viajeTable.fechaFinReal), isNull(viajeTable.motivoCancelacion)))
      .groupBy(viajeTable.conductorId)
      .as('viajes_como_conductor');

    const viajesComoPasajero = db
      .select({
        usuarioId: solicitudViajeTable.pasajeroId,
        cantidadPasajero: sql<number>`count(${solicitudViajeTable.id})::int`.as('cantidad_pasajero'),
      })
      .from(solicitudViajeTable)
      .innerJoin(viajeTable, eq(solicitudViajeTable.viajeId, viajeTable.id))
      .where(
        and(
          isNotNull(solicitudViajeTable.fechaRespuesta),
          eq(solicitudViajeTable.respuesta, true),
          isNotNull(viajeTable.fechaFinReal),
          isNull(viajeTable.motivoCancelacion),
        ),
      )
      .groupBy(solicitudViajeTable.pasajeroId)
      .as('viajes_como_pasajero');

    const viajesFinalizados = sql<number>`coalesce(${viajesComoConductor.cantidadConductor}, 0)
      + coalesce(${viajesComoPasajero.cantidadPasajero}, 0)`;
    const condiciones = and(
      gt(viajesFinalizados, 0),
      filtros.institucionId === undefined
        ? undefined
        : eq(usuarioTable.institucionId, filtros.institucionId),
      filtros.buscar
        ? ilike(
            sql`${usuarioTable.nombre} || ' ' || ${usuarioTable.apellidos}`,
            `%${filtros.buscar}%`,
          )
        : undefined,
    );

    const usuariosConViajes = db
      .select({
        usuarioId: usuarioTable.id,
        usuario: sql<string>`${usuarioTable.nombre} || ' ' || ${usuarioTable.apellidos}`.as('usuario'),
        institucion: institucionTable.nombre,
        viajesFinalizados: viajesFinalizados.as('viajes_finalizados'),
      })
      .from(usuarioTable)
      .innerJoin(institucionTable, eq(usuarioTable.institucionId, institucionTable.id))
      .leftJoin(viajesComoConductor, eq(viajesComoConductor.usuarioId, usuarioTable.id))
      .leftJoin(viajesComoPasajero, eq(viajesComoPasajero.usuarioId, usuarioTable.id))
      .where(condiciones)
      .as('usuarios_activos');

    const [usuarios, [total]] = await Promise.all([
      db
        .select()
        .from(usuariosConViajes)
        .orderBy(
          desc(usuariosConViajes.viajesFinalizados),
          asc(usuariosConViajes.usuario),
          asc(usuariosConViajes.usuarioId),
        )
        .limit(filtros.top),
      db
        .select({ total: count() })
        .from(usuariosConViajes),
    ]);

    return { usuarios, totalUsuarios: total?.total ?? 0 };
  }

  async montoPromedio(filtros: FiltrosMonto) {
    // Institución del conductor; fechas de salida programada, con ambos días incluidos.
    const condiciones = and(
      filtros.institucionId === undefined
        ? undefined
        : eq(usuarioTable.institucionId, filtros.institucionId),
      filtros.desde ? gte(viajeTable.fechaHoraSalida, sql`${filtros.desde}::date`) : undefined,
      filtros.hasta
        ? lt(viajeTable.fechaHoraSalida, sql`(${filtros.hasta}::date + interval '1 day')`)
        : undefined,
    );

    // PostgreSQL devuelve números exactos (numeric) como texto: conversión explícita a JS.
    const [totales] = await db
      .select({
        viajesEnPeriodo: sql<number>`count(*)::int`,
        viajesConCobro: sql<number>`count(*) filter (where ${viajeTable.costo} > 0)::int`,
        montoPromedio: sql<number | null>`(avg(${viajeTable.costo}) filter (where ${viajeTable.costo} > 0))::float8`,
        montoMinimo: sql<number | null>`(min(${viajeTable.costo}) filter (where ${viajeTable.costo} > 0))::float8`,
        montoMaximo: sql<number | null>`(max(${viajeTable.costo}) filter (where ${viajeTable.costo} > 0))::float8`,
      })
      .from(viajeTable)
      .innerJoin(usuarioTable, eq(viajeTable.conductorId, usuarioTable.id))
      .where(condiciones);

    const porInstitucion = await db
      .select({
        institucionId: institucionTable.id,
        institucion: institucionTable.nombre,
        montoPromedio: sql<number>`avg(${viajeTable.costo})::float8`,
        viajesConCobro: sql<number>`count(*)::int`,
      })
      .from(viajeTable)
      .innerJoin(usuarioTable, eq(viajeTable.conductorId, usuarioTable.id))
      .innerJoin(institucionTable, eq(usuarioTable.institucionId, institucionTable.id))
      .where(and(condiciones, gt(viajeTable.costo, '0')))
      .groupBy(institucionTable.id, institucionTable.nombre)
      .orderBy(institucionTable.nombre);

    const total = totales?.viajesEnPeriodo ?? 0;
    const cobrados = totales?.viajesConCobro ?? 0;
    return {
      filtros,
      viajesEnPeriodo: total,
      viajesConCobro: cobrados,
      viajesSinCobro: total - cobrados,
      montoPromedio: totales?.montoPromedio ?? null,
      montoMinimo: totales?.montoMinimo ?? null,
      montoMaximo: totales?.montoMaximo ?? null,
      promedioPorInstitucion: porInstitucion,
    };
  }
}
