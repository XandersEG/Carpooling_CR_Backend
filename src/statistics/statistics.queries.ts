//---------------------------------------------------------------------------------------------------
import { 
    and, 
    between, 
    count, 
    eq, 
    gte, 
    isNotNull, 
    isNull, 
    lt, 
    sql,
    asc
} from "drizzle-orm";
import { union } from 'drizzle-orm/pg-core';
import { db } from '../database/queries.js';
import { catalogoMetodoDePagoTable, catalogoOpcionesDeGenero, catalogoRangosDeEdad, solicitudViajeTable, usuarioTable, viajeTable } from "../database/schemas.js";

//---------------------------------------------------------------------------------------------------
// Filtros generales \(^-^)/

export interface FiltrosEstadisticas{ // Filtros generales
    institucionId?: number; desde?: string; hasta?: string;
}

//---------------------------------------------------------------------------------------------------
// Funciones de apoyo para filtros (o.O)-b

function viajeFinalizadoEnRango(filtros: FiltrosEstadisticas){
    return and(
        isNotNull(viajeTable.fechaFinReal),
        isNull(viajeTable.motivoCancelacion),
        filtros.desde ? gte(viajeTable.fechaHoraSalida, 
            sql`${filtros.desde}::date`) : undefined,
        filtros.desde ? lt(viajeTable.fechaHoraSalida, 
            sql`${filtros.hasta}::date + 1`) : undefined,
    );
}


function usuariosDeInstitucion(filtros: FiltrosEstadisticas){
    return filtros.institucionId ? eq(usuarioTable.institucionId, filtros.institucionId) : undefined;
}

//---------------------------------------------------------------------------------------------------

export function conductoresActivos(filtros: FiltrosEstadisticas){
    return db.selectDistinct({
        usuarioId: viajeTable.conductorId,
    })
    .from(viajeTable)
    .innerJoin(usuarioTable, eq(usuarioTable.id, viajeTable.conductorId))
    .where(
        and(viajeFinalizadoEnRango(filtros), usuariosDeInstitucion(filtros))
    )
}


export function pasajerosActivos(filtros: FiltrosEstadisticas){
    return db.selectDistinct({
        usuarioId: solicitudViajeTable.pasajeroId,
    })
    .from(solicitudViajeTable)
    .innerJoin(usuarioTable, eq(usuarioTable.id, solicitudViajeTable.pasajeroId))
    .innerJoin(viajeTable, eq(viajeTable.id, solicitudViajeTable.viajeId))
    .where(
        and(isNotNull(solicitudViajeTable.fechaRespuesta), eq(solicitudViajeTable.respuesta, true), 
        viajeFinalizadoEnRango(filtros), usuariosDeInstitucion(filtros))
    )
}

//---------------------------------------------------------------------------------------------------
// Cantidades totales de roles para las fichas de resumen (^3^)/<3

export async function cantidadConductores(filtros: FiltrosEstadisticas){
    return await db.select({
        total: count(),
    })
    .from(conductoresActivos(filtros).as('c'))
}

export async function cantidadPasajeros(filtros: FiltrosEstadisticas){
    return await db.select({
        total: count(),
    })
    .from(pasajerosActivos(filtros).as('p'))
}

export async function cantidadUnicos(filtros: FiltrosEstadisticas){
    return await db.select({
        total: count(),
    })
    .from(union(conductoresActivos(filtros), pasajerosActivos(filtros)).as('u'))
}

export async function resumenCantidadDatos(filtros: FiltrosEstadisticas){
    const [[conductores], [pasajeros], [unicos]] = await Promise.all([
        cantidadConductores(filtros),
        cantidadPasajeros(filtros),
        cantidadUnicos(filtros),
    ]);
    return{
        conductoresActivos: conductores.total,
        pasajerosActivos: pasajeros.total,
        usuariosUnicos: unicos.total,
        ambosRoles: conductores.total + pasajeros.total - unicos.total,
    };
}

//---------------------------------------------------------------------------------------------------
// Más consultas (-w-)Zzz

export function conductoresPorGenero(filtros: FiltrosEstadisticas){
    const conductores = conductoresActivos(filtros).as('c');
    return db.select({
        genero: catalogoOpcionesDeGenero.nombre,
        total: count(conductores.usuarioId),
    })
    .from(catalogoOpcionesDeGenero)
    .leftJoin(usuarioTable, eq(usuarioTable.generoId, catalogoOpcionesDeGenero.id))
    .leftJoin(conductores, eq(conductores.usuarioId, usuarioTable.id))
    .groupBy(catalogoOpcionesDeGenero.id, catalogoOpcionesDeGenero.nombre)
    .orderBy(catalogoOpcionesDeGenero.id);
}

export function pasajerosPorGenero(filtros: FiltrosEstadisticas){
    const pasajeros = pasajerosActivos(filtros).as('p');
    return db.select({
        genero: catalogoOpcionesDeGenero.nombre,
        total: count(pasajeros.usuarioId),
    })
    .from(catalogoOpcionesDeGenero)
    .leftJoin(usuarioTable, eq(usuarioTable.generoId, catalogoOpcionesDeGenero.id))
    .leftJoin(pasajeros, eq(pasajeros.usuarioId, usuarioTable.id))
    .groupBy(catalogoOpcionesDeGenero.id, catalogoOpcionesDeGenero.nombre)
    .orderBy(catalogoOpcionesDeGenero.id)
}

//---------------------------------------------------------------------------------------------------
//

export function viajesPorMetodoPago(filtros: FiltrosEstadisticas){
    const viajes = db.select({
        id: viajeTable.id,
        metodoPagoId: viajeTable.metodoPagoId,
    })
    .from(viajeTable)
    .innerJoin(usuarioTable, eq(usuarioTable.id, viajeTable.conductorId))
    .where(
        and(viajeFinalizadoEnRango(filtros), usuariosDeInstitucion(filtros))
    )
    .as('v');

    return db.select({
        metodo: catalogoMetodoDePagoTable.nombre,
        total: count(viajes.id),
    })
    .from(catalogoMetodoDePagoTable)
    .leftJoin(viajes, eq(viajes.metodoPagoId, catalogoMetodoDePagoTable.id))
    .groupBy(catalogoMetodoDePagoTable.id, catalogoMetodoDePagoTable.nombre)
    .orderBy(catalogoMetodoDePagoTable.id)
}

// Función agregada al final porque se me olvido que existia :b

export function usuariosPorRangoEdad(filtros: FiltrosEstadisticas){
    const activos = union(conductoresActivos(filtros), pasajerosActivos(filtros)).as('a')
    const edad = sql<number>`date_part('year', age(${usuarioTable.fechaNacimiento}))`;
    return db.select({
        rango: catalogoRangosDeEdad.nombre,
        genero: catalogoOpcionesDeGenero.nombre,
        total: count(activos.usuarioId),
    })
    .from(catalogoRangosDeEdad)
    .crossJoin(catalogoOpcionesDeGenero)
    .leftJoin(usuarioTable,
        and(eq(usuarioTable.generoId, catalogoOpcionesDeGenero.id),
        between(edad, catalogoRangosDeEdad.edadMinima, catalogoRangosDeEdad.edadMaxima),
        ),
    )
    .leftJoin(activos, eq(activos.usuarioId, usuarioTable.id))
    .where(eq(catalogoRangosDeEdad.activo, true))
    .groupBy(
        catalogoRangosDeEdad.id,
        catalogoRangosDeEdad.nombre,
        catalogoOpcionesDeGenero.id,
        catalogoOpcionesDeGenero.nombre,
    )
    .orderBy(asc(catalogoRangosDeEdad.edadMinima), asc(catalogoOpcionesDeGenero.id));
}