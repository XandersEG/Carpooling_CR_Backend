import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '../database/queries.js';
import {
  catalogoOpcionesDeGenero,
  institucionTable,
  solicitudViajeTable,
  usuarioTable,
  viajeTable,
} from '../database/schemas.js';

// consultas del perfil del usuario de la app ("Mi Perfil" y "Lugares frecuentes")

/** Perfil completo del usuario, sin hash ni tokens. */
export async function buscarPerfil(usuarioId: number) {
  const [perfil] = await db
    .select({
      id: usuarioTable.id,
      nombre: usuarioTable.nombre,
      apellidos: usuarioTable.apellidos,
      correo: usuarioTable.correoInstitucional,
      telefono: usuarioTable.telefono,
      fotoUrl: usuarioTable.fotoUrl,
      fechaNacimiento: usuarioTable.fechaNacimiento,
      esConductor: usuarioTable.esConductor,
      correoVerificado: sql<boolean>`${usuarioTable.tokenVerificacion} IS NULL`,
      creadoEn: usuarioTable.creadoEn,
      institucion: institucionTable.nombre,
      genero: catalogoOpcionesDeGenero.nombre,
    })
    .from(usuarioTable)
    .innerJoin(institucionTable, eq(usuarioTable.institucionId, institucionTable.id))
    .innerJoin(
      catalogoOpcionesDeGenero,
      eq(usuarioTable.generoId, catalogoOpcionesDeGenero.id),
    )
    .where(and(eq(usuarioTable.id, usuarioId), eq(usuarioTable.activo, true)));
  return perfil ?? null;
}

/** Opción de género activa con ese nombre (sin distinguir mayúsculas). */
export async function buscarGeneroPorNombre(nombre: string) {
  const opciones = await db
    .select({ id: catalogoOpcionesDeGenero.id })
    .from(catalogoOpcionesDeGenero)
    .where(
      and(
        sql`lower(${catalogoOpcionesDeGenero.nombre}) = ${nombre.trim().toLowerCase()}`,
        eq(catalogoOpcionesDeGenero.activo, true),
      ),
    );
  return opciones.length === 1 ? opciones[0] : null;
}

export async function guardarPerfil(
  usuarioId: number,
  cambios: Partial<
    Pick<
      typeof usuarioTable.$inferInsert,
      'nombre' | 'apellidos' | 'telefono' | 'generoId' | 'fechaNacimiento' | 'esConductor'
    >
  >,
) {
  const [actualizado] = await db
    .update(usuarioTable)
    .set(cambios)
    .where(eq(usuarioTable.id, usuarioId))
    .returning({ id: usuarioTable.id });
  return actualizado ?? null;
}

/** Viajes del conductor que todavía no terminan (programados o en curso). */
export async function contarViajesActivosDeConductor(conductorId: number) {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(viajeTable)
    .where(
      and(
        eq(viajeTable.conductorId, conductorId),
        isNull(viajeTable.fechaFinReal),
        isNull(viajeTable.motivoCancelacion),
      ),
    );
  return fila?.total ?? 0;
}

/**
 * Lugares que más aparecen en los viajes del usuario (como conductor o como
 * pasajero aceptado), contando origen y destino. Los viajes cancelados no cuentan.
 */
export async function buscarLugaresFrecuentes(usuarioId: number, limite = 5) {
  const viajes = await db
    .select({
      nombre: viajeTable.destinoNombre,
      origenNombre: viajeTable.origenNombre,
      destinoLat: viajeTable.destinoLat,
      destinoLng: viajeTable.destinoLng,
      origenLat: viajeTable.origenLat,
      origenLng: viajeTable.origenLng,
    })
    .from(viajeTable)
    .leftJoin(
      solicitudViajeTable,
      and(
        eq(solicitudViajeTable.viajeId, viajeTable.id),
        eq(solicitudViajeTable.pasajeroId, usuarioId),
        sql`${solicitudViajeTable.fechaRespuesta} IS NOT NULL`,
        eq(solicitudViajeTable.respuesta, true),
      ),
    )
    .where(
      and(
        isNull(viajeTable.motivoCancelacion),
        or(eq(viajeTable.conductorId, usuarioId), sql`${solicitudViajeTable.id} IS NOT NULL`),
      ),
    );

  // se agrupan en memoria: son pocos viajes por usuario y así no se depende del SQL de cada motor
  const conteo = new Map<string, { nombre: string; lat: number; lng: number; veces: number }>();
  const sumar = (nombre: string, lat: string, lng: string) => {
    const clave = nombre.trim().toLowerCase();
    if (!clave) return;
    const actual = conteo.get(clave);
    if (actual) actual.veces += 1;
    else conteo.set(clave, { nombre: nombre.trim(), lat: Number(lat), lng: Number(lng), veces: 1 });
  };
  for (const viaje of viajes) {
    sumar(viaje.nombre, viaje.destinoLat, viaje.destinoLng);
    sumar(viaje.origenNombre, viaje.origenLat, viaje.origenLng);
  }

  return [...conteo.values()]
    .sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, limite);
}
