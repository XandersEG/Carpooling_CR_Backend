import { Injectable } from '@nestjs/common';
import { and, eq, gt, gte, lt, sql } from 'drizzle-orm';
import { db } from '../database/queries.js';
import {
  institucionTable,
  usuarioTable,
  viajeTable,
} from '../database/schemas.js';

type FiltrosMonto = { institucionId?: number; desde?: string; hasta?: string };

@Injectable()
export class ConsultasAdminService {
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
