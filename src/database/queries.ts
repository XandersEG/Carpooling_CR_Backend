import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  lt,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  administradorTable,
  catalogoTable,
  catalogoValorTable,
  institucionTable,
  solicitudViajeTable,
  tokenRefrescoTable,
  usuarioTable,
  vehiculoTable,
  viajeTable,
} from './schemas';

export const db = drizzle(process.env.DATABASE_URL!);

/* -------------------------------------------------------------------------- */
/*  CÓDIGOS DE CATÁLOGO                                                       */
/*  Deben coincidir con los valores que insertes en `catalogo` y              */
/*  `catalogo_valor` (ajusta estos textos si usas otros códigos).             */
/* -------------------------------------------------------------------------- */

export const CATALOGOS = {
  GENERO: 'GENERO',
  ESTADO_VIAJE: 'ESTADO_VIAJE',
  ESTADO_SOLICITUD: 'ESTADO_SOLICITUD',
  METODO_PAGO: 'METODO_PAGO',
} as const;

export const ESTADO_VIAJE = {
  PROGRAMADO: 'PROGRAMADO',
  EN_CURSO: 'EN_CURSO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
} as const;

export const ESTADO_SOLICITUD = {
  PENDIENTE: 'PENDIENTE',
  ACEPTADA: 'ACEPTADA',
  RECHAZADA: 'RECHAZADA',
  CANCELADA: 'CANCELADA',
} as const;

// Acepta tanto `db` como una transacción `tx`
type Ejecutor = Pick<typeof db, 'select'>;

/* -------------------------------------------------------------------------- */
/*  CATÁLOGOS                                                                 */
/* -------------------------------------------------------------------------- */

/** Lista los valores activos de un catálogo (ej. todos los géneros). */
export async function obtenerValoresCatalogo(codigoCatalogo: string) {
  return db
    .select({
      id: catalogoValorTable.id,
      codigo: catalogoValorTable.codigo,
      etiqueta: catalogoValorTable.etiqueta,
      edadMin: catalogoValorTable.edadMin,
      edadMax: catalogoValorTable.edadMax,
    })
    .from(catalogoValorTable)
    .innerJoin(catalogoTable, eq(catalogoValorTable.catalogoId, catalogoTable.id))
    .where(
      and(eq(catalogoTable.codigo, codigoCatalogo), eq(catalogoValorTable.activo, true)),
    )
    .orderBy(asc(catalogoValorTable.orden));
}

/** Devuelve el id de un valor de catálogo a partir de sus códigos. */
export async function obtenerIdValorCatalogo(
  codigoCatalogo: string,
  codigoValor: string,
  ejecutor: Ejecutor = db,
) {
  const [fila] = await ejecutor
    .select({ id: catalogoValorTable.id })
    .from(catalogoValorTable)
    .innerJoin(catalogoTable, eq(catalogoValorTable.catalogoId, catalogoTable.id))
    .where(
      and(
        eq(catalogoTable.codigo, codigoCatalogo),
        eq(catalogoValorTable.codigo, codigoValor),
      ),
    );

  if (!fila) {
    throw new Error(`No existe el valor "${codigoValor}" en el catálogo "${codigoCatalogo}"`);
  }
  return fila.id;
}

/* -------------------------------------------------------------------------- */
/*  INSTITUCIONES                                                             */
/* -------------------------------------------------------------------------- */

/** Busca la institución activa que corresponde al dominio de un correo (ej. "ucr.ac.cr"). */
export async function buscarInstitucionPorDominio(dominio: string) {
  const [institucion] = await db
    .select()
    .from(institucionTable)
    .where(and(eq(institucionTable.dominioCorreo, dominio), eq(institucionTable.activa, true)));
  return institucion ?? null;
}

/**
 * Crea una institución. El dominio se normaliza (minúsculas, sin espacios ni "@"),
 * por ejemplo "@UCR.ac.cr " se guarda como "ucr.ac.cr".
 * Lanza un error claro si ya existe una institución con ese dominio.
 */
export async function crearInstitucion(datos: {
  nombre: string;
  dominioCorreo: string;
  logoUrl?: string;
  activa?: boolean;
}) {
  const dominioCorreo = datos.dominioCorreo.trim().toLowerCase().replace(/^@/, '');
 
  const [institucion] = await db
    .insert(institucionTable)
    .values({
      nombre: datos.nombre.trim(),
      dominioCorreo,
      logoUrl: datos.logoUrl ?? null,
      activa: datos.activa ?? true,
    })
    .onConflictDoNothing({ target: institucionTable.dominioCorreo })
    .returning();
 
  if (!institucion) {
    throw new Error(`Ya existe una institución con el dominio "${dominioCorreo}"`);
  }
  return institucion;
}

/* -------------------------------------------------------------------------- */
/*  USUARIOS                                                                  */
/* -------------------------------------------------------------------------- */

/** Para el login: devuelve el usuario con su hash (no lo envíes al cliente). */
export async function buscarUsuarioPorCorreo(correo: string) {
  const [usuario] = await db
    .select()
    .from(usuarioTable)
    .where(eq(usuarioTable.correoInstitucional, correo.toLowerCase()));
  return usuario ?? null;
}

export async function crearUsuario(
  datos: Omit<typeof usuarioTable.$inferInsert, 'id' | 'creadoEn' | 'actualizadoEn'>,
) {
  const [nuevo] = await db
    .insert(usuarioTable)
    .values({ ...datos, correoInstitucional: datos.correoInstitucional.toLowerCase() })
    .returning({ id: usuarioTable.id, correoInstitucional: usuarioTable.correoInstitucional });
  return nuevo;
}

/** Marca el correo como verificado usando el token enviado por email. */
export async function verificarCorreo(token: string) {
  const [usuario] = await db
    .update(usuarioTable)
    .set({ correoVerificado: true, tokenVerificacion: null })
    .where(and(eq(usuarioTable.tokenVerificacion, token), eq(usuarioTable.correoVerificado, false)))
    .returning({ id: usuarioTable.id });
  return usuario ?? null;
}

/** Perfil público de un usuario con su institución y género (sin datos sensibles). */
export async function obtenerPerfilUsuario(usuarioId: number) {
  const genero = alias(catalogoValorTable, 'genero');

  const [perfil] = await db
    .select({
      id: usuarioTable.id,
      nombre: usuarioTable.nombre,
      apellidos: usuarioTable.apellidos,
      correo: usuarioTable.correoInstitucional,
      telefono: usuarioTable.telefono,
      fotoUrl: usuarioTable.fotoUrl,
      esConductor: usuarioTable.esConductor,
      correoVerificado: usuarioTable.correoVerificado,
      institucion: institucionTable.nombre,
      genero: genero.etiqueta,
    })
    .from(usuarioTable)
    .innerJoin(institucionTable, eq(usuarioTable.institucionId, institucionTable.id))
    .innerJoin(genero, eq(usuarioTable.generoId, genero.id))
    .where(eq(usuarioTable.id, usuarioId));
  return perfil ?? null;
}

export async function actualizarPerfil(
  usuarioId: number,
  cambios: Partial<Pick<typeof usuarioTable.$inferInsert, 'nombre' | 'apellidos' | 'telefono' | 'fotoUrl'>>,
) {
  const [actualizado] = await db
    .update(usuarioTable)
    .set(cambios)
    .where(eq(usuarioTable.id, usuarioId))
    .returning({ id: usuarioTable.id });
  return actualizado ?? null;
}

/* -------------------------------------------------------------------------- */
/*  ADMINISTRADORES Y TOKENS DE REFRESCO                                      */
/* -------------------------------------------------------------------------- */

export async function buscarAdministradorPorCorreo(correo: string) {
  const [admin] = await db
    .select()
    .from(administradorTable)
    .where(and(eq(administradorTable.correo, correo.toLowerCase()), eq(administradorTable.activo, true)));
  return admin ?? null;
}

/** Guarda un token de refresco para un usuario O un administrador (uno de los dos). */
export async function guardarTokenRefresco(datos: {
  usuarioId?: number;
  administradorId?: number;
  tokenHash: string;
  expiraEn: Date;
}) {
  const [token] = await db
    .insert(tokenRefrescoTable)
    .values({
      usuarioId: datos.usuarioId ?? null,
      administradorId: datos.administradorId ?? null,
      tokenHash: datos.tokenHash,
      expiraEn: datos.expiraEn,
    })
    .returning({ id: tokenRefrescoTable.id });
  return token;
}

/** Devuelve el token solo si no está revocado ni vencido. */
export async function buscarTokenRefrescoValido(tokenHash: string) {
  const [token] = await db
    .select()
    .from(tokenRefrescoTable)
    .where(
      and(
        eq(tokenRefrescoTable.tokenHash, tokenHash),
        eq(tokenRefrescoTable.revocado, false),
        gt(tokenRefrescoTable.expiraEn, new Date()),
      ),
    );
  return token ?? null;
}

export async function revocarTokenRefresco(tokenHash: string) {
  await db
    .update(tokenRefrescoTable)
    .set({ revocado: true })
    .where(eq(tokenRefrescoTable.tokenHash, tokenHash));
}

/** Cierra todas las sesiones de un usuario (ej. al cambiar contraseña). */
export async function revocarTokensDeUsuario(usuarioId: number) {
  await db
    .update(tokenRefrescoTable)
    .set({ revocado: true })
    .where(eq(tokenRefrescoTable.usuarioId, usuarioId));
}

/** Tarea de mantenimiento: borra tokens vencidos. Devuelve cuántos eliminó. */
export async function limpiarTokensVencidos() {
  const borrados = await db
    .delete(tokenRefrescoTable)
    .where(lt(tokenRefrescoTable.expiraEn, new Date()))
    .returning({ id: tokenRefrescoTable.id });
  return borrados.length;
}

/* -------------------------------------------------------------------------- */
/*  VEHÍCULOS                                                                 */
/* -------------------------------------------------------------------------- */

export async function obtenerVehiculosDeUsuario(usuarioId: number) {
  return db
    .select()
    .from(vehiculoTable)
    .where(and(eq(vehiculoTable.usuarioId, usuarioId), eq(vehiculoTable.activo, true)))
    .orderBy(asc(vehiculoTable.marca), asc(vehiculoTable.modelo));
}

export async function registrarVehiculo(
  datos: Omit<typeof vehiculoTable.$inferInsert, 'id' | 'creadoEn'>,
) {
  return db.transaction(async (tx) => {
    const [vehiculo] = await tx.insert(vehiculoTable).values(datos).returning();
    // Registrar un vehículo convierte al usuario en conductor
    await tx
      .update(usuarioTable)
      .set({ esConductor: true })
      .where(eq(usuarioTable.id, datos.usuarioId));
    return vehiculo;
  });
}

/** Desactiva el vehículo en lugar de borrarlo, para conservar el historial de viajes. */
export async function desactivarVehiculo(vehiculoId: number, usuarioId: number) {
  const [vehiculo] = await db
    .update(vehiculoTable)
    .set({ activo: false })
    .where(and(eq(vehiculoTable.id, vehiculoId), eq(vehiculoTable.usuarioId, usuarioId)))
    .returning({ id: vehiculoTable.id });
  return vehiculo ?? null;
}

/* -------------------------------------------------------------------------- */
/*  VIAJES                                                                    */
/* -------------------------------------------------------------------------- */

/** Crea un viaje en estado PROGRAMADO con todos los cupos disponibles. */
export async function crearViaje(
  datos: Omit<
    typeof viajeTable.$inferInsert,
    'id' | 'estadoId' | 'cuposDisponibles' | 'creadoEn' | 'actualizadoEn'
  >,
) {
  return db.transaction(async (tx) => {
    const [vehiculo] = await tx
      .select({ capacidad: vehiculoTable.capacidadPasajeros })
      .from(vehiculoTable)
      .where(
        and(
          eq(vehiculoTable.id, datos.vehiculoId),
          eq(vehiculoTable.usuarioId, datos.conductorId),
          eq(vehiculoTable.activo, true),
        ),
      );

    if (!vehiculo) throw new Error('El vehículo no existe o no pertenece al conductor');
    if (datos.cuposTotales > vehiculo.capacidad) {
      throw new Error(`El vehículo solo admite ${vehiculo.capacidad} pasajeros`);
    }

    const estadoId = await obtenerIdValorCatalogo(
      CATALOGOS.ESTADO_VIAJE,
      ESTADO_VIAJE.PROGRAMADO,
      tx,
    );

    const [viaje] = await tx
      .insert(viajeTable)
      .values({ ...datos, estadoId, cuposDisponibles: datos.cuposTotales })
      .returning();
    return viaje;
  });
}

/**
 * Busca viajes programados con cupos libres y salida futura.
 * Si se pasa origenLat/origenLng, filtra por un cuadro alrededor del punto
 * (radioGrados = 0.05 equivale a ~5 km).
 */
export async function buscarViajesDisponibles(
  filtros: {
    desde?: Date;
    origenLat?: number;
    origenLng?: number;
    radioGrados?: number;
    destinoNombre?: string;
  } = {},
) {
  const conductor = alias(usuarioTable, 'conductor');
  const metodoPago = alias(catalogoValorTable, 'metodo_pago');

  const programadoId = await obtenerIdValorCatalogo(
    CATALOGOS.ESTADO_VIAJE,
    ESTADO_VIAJE.PROGRAMADO,
  );

  const condiciones = [
    eq(viajeTable.estadoId, programadoId),
    gt(viajeTable.cuposDisponibles, 0),
    gte(viajeTable.fechaHoraSalida, filtros.desde ?? new Date()),
  ];

  if (filtros.origenLat !== undefined && filtros.origenLng !== undefined) {
    const r = filtros.radioGrados ?? 0.05;
    condiciones.push(
      between(viajeTable.origenLat, String(filtros.origenLat - r), String(filtros.origenLat + r)),
      between(viajeTable.origenLng, String(filtros.origenLng - r), String(filtros.origenLng + r)),
    );
  }

  if (filtros.destinoNombre) {
    condiciones.push(ilike(viajeTable.destinoNombre, `%${filtros.destinoNombre}%`));
  }

  return db
    .select({
      id: viajeTable.id,
      origen: viajeTable.origenNombre,
      destino: viajeTable.destinoNombre,
      salida: viajeTable.fechaHoraSalida,
      cuposDisponibles: viajeTable.cuposDisponibles,
      costo: viajeTable.costo,
      metodoPago: metodoPago.etiqueta,
      conductor: sql<string>`${conductor.nombre} || ' ' || ${conductor.apellidos}`,
      conductorFoto: conductor.fotoUrl,
      vehiculo: sql<string>`${vehiculoTable.marca} || ' ' || ${vehiculoTable.modelo}`,
      color: vehiculoTable.color,
    })
    .from(viajeTable)
    .innerJoin(conductor, eq(viajeTable.conductorId, conductor.id))
    .innerJoin(vehiculoTable, eq(viajeTable.vehiculoId, vehiculoTable.id))
    .innerJoin(metodoPago, eq(viajeTable.metodoPagoId, metodoPago.id))
    .where(and(...condiciones))
    .orderBy(asc(viajeTable.fechaHoraSalida));
}

/** Detalle completo de un viaje (incluye la polyline de la ruta). */
export async function obtenerDetalleViaje(viajeId: number) {
  const conductor = alias(usuarioTable, 'conductor');
  const estado = alias(catalogoValorTable, 'estado');
  const metodoPago = alias(catalogoValorTable, 'metodo_pago');

  const [viaje] = await db
    .select({
      viaje: viajeTable,
      estado: estado.etiqueta,
      metodoPago: metodoPago.etiqueta,
      conductorNombre: conductor.nombre,
      conductorApellidos: conductor.apellidos,
      conductorTelefono: conductor.telefono,
      conductorFoto: conductor.fotoUrl,
      placa: vehiculoTable.placa,
      marca: vehiculoTable.marca,
      modelo: vehiculoTable.modelo,
      color: vehiculoTable.color,
    })
    .from(viajeTable)
    .innerJoin(conductor, eq(viajeTable.conductorId, conductor.id))
    .innerJoin(vehiculoTable, eq(viajeTable.vehiculoId, vehiculoTable.id))
    .innerJoin(estado, eq(viajeTable.estadoId, estado.id))
    .innerJoin(metodoPago, eq(viajeTable.metodoPagoId, metodoPago.id))
    .where(eq(viajeTable.id, viajeId));
  return viaje ?? null;
}

/** Historial de viajes publicados por un conductor, del más reciente al más antiguo. */
export async function obtenerViajesDeConductor(conductorId: number) {
  const estado = alias(catalogoValorTable, 'estado');

  return db
    .select({
      id: viajeTable.id,
      origen: viajeTable.origenNombre,
      destino: viajeTable.destinoNombre,
      salida: viajeTable.fechaHoraSalida,
      cuposTotales: viajeTable.cuposTotales,
      cuposDisponibles: viajeTable.cuposDisponibles,
      costo: viajeTable.costo,
      estado: estado.etiqueta,
    })
    .from(viajeTable)
    .innerJoin(estado, eq(viajeTable.estadoId, estado.id))
    .where(eq(viajeTable.conductorId, conductorId))
    .orderBy(desc(viajeTable.fechaHoraSalida));
}

/** Cambia el estado de un viaje del conductor y registra fechas reales si aplica. */
async function cambiarEstadoViaje(
  viajeId: number,
  conductorId: number,
  estadoCodigo: string,
  extra: Partial<typeof viajeTable.$inferInsert> = {},
) {
  const estadoId = await obtenerIdValorCatalogo(CATALOGOS.ESTADO_VIAJE, estadoCodigo);

  const [viaje] = await db
    .update(viajeTable)
    .set({ estadoId, ...extra })
    .where(and(eq(viajeTable.id, viajeId), eq(viajeTable.conductorId, conductorId)))
    .returning();

  if (!viaje) throw new Error('El viaje no existe o no pertenece al conductor');
  return viaje;
}

export const iniciarViaje = (viajeId: number, conductorId: number) =>
  cambiarEstadoViaje(viajeId, conductorId, ESTADO_VIAJE.EN_CURSO, {
    fechaInicioReal: new Date(),
  });

export const finalizarViaje = (viajeId: number, conductorId: number) =>
  cambiarEstadoViaje(viajeId, conductorId, ESTADO_VIAJE.FINALIZADO, {
    fechaFinReal: new Date(),
  });

export const cancelarViaje = (viajeId: number, conductorId: number, motivo: string) =>
  cambiarEstadoViaje(viajeId, conductorId, ESTADO_VIAJE.CANCELADO, {
    motivoCancelacion: motivo,
  });

/* -------------------------------------------------------------------------- */
/*  SOLICITUDES DE VIAJE                                                      */
/* -------------------------------------------------------------------------- */

/** Un pasajero pide unirse a un viaje (queda PENDIENTE hasta que el conductor responda). */
export async function solicitarViaje(datos: {
  viajeId: number;
  pasajeroId: number;
  puntoRecogidaNombre: string;
  puntoRecogidaLat: string;
  puntoRecogidaLng: string;
}) {
  return db.transaction(async (tx) => {
    const [viaje] = await tx
      .select({
        conductorId: viajeTable.conductorId,
        estadoId: viajeTable.estadoId,
        cuposDisponibles: viajeTable.cuposDisponibles,
      })
      .from(viajeTable)
      .where(eq(viajeTable.id, datos.viajeId));

    if (!viaje) throw new Error('El viaje no existe');
    if (viaje.conductorId === datos.pasajeroId) {
      throw new Error('No puedes solicitar tu propio viaje');
    }

    const programadoId = await obtenerIdValorCatalogo(
      CATALOGOS.ESTADO_VIAJE,
      ESTADO_VIAJE.PROGRAMADO,
      tx,
    );
    if (viaje.estadoId !== programadoId) throw new Error('El viaje ya no acepta solicitudes');
    if (viaje.cuposDisponibles <= 0) throw new Error('El viaje no tiene cupos disponibles');

    const pendienteId = await obtenerIdValorCatalogo(
      CATALOGOS.ESTADO_SOLICITUD,
      ESTADO_SOLICITUD.PENDIENTE,
      tx,
    );

    // Si el pasajero ya solicitó este viaje, la restricción única lanzará un error
    const [solicitud] = await tx
      .insert(solicitudViajeTable)
      .values({ ...datos, estadoId: pendienteId })
      .returning();
    return solicitud;
  });
}

/** Solicitudes recibidas en un viaje, con los datos del pasajero. */
export async function obtenerSolicitudesDeViaje(viajeId: number) {
  const estado = alias(catalogoValorTable, 'estado');

  return db
    .select({
      id: solicitudViajeTable.id,
      pasajeroId: usuarioTable.id,
      pasajero: sql<string>`${usuarioTable.nombre} || ' ' || ${usuarioTable.apellidos}`,
      telefono: usuarioTable.telefono,
      fotoUrl: usuarioTable.fotoUrl,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
      lat: solicitudViajeTable.puntoRecogidaLat,
      lng: solicitudViajeTable.puntoRecogidaLng,
      estado: estado.etiqueta,
      fechaSolicitud: solicitudViajeTable.fechaSolicitud,
    })
    .from(solicitudViajeTable)
    .innerJoin(usuarioTable, eq(solicitudViajeTable.pasajeroId, usuarioTable.id))
    .innerJoin(estado, eq(solicitudViajeTable.estadoId, estado.id))
    .where(eq(solicitudViajeTable.viajeId, viajeId))
    .orderBy(asc(solicitudViajeTable.fechaSolicitud));
}

/** Solicitudes hechas por un pasajero, con el viaje al que corresponden. */
export async function obtenerSolicitudesDePasajero(pasajeroId: number) {
  const estado = alias(catalogoValorTable, 'estado');

  return db
    .select({
      id: solicitudViajeTable.id,
      viajeId: viajeTable.id,
      origen: viajeTable.origenNombre,
      destino: viajeTable.destinoNombre,
      salida: viajeTable.fechaHoraSalida,
      costo: viajeTable.costo,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
      estado: estado.etiqueta,
      fechaSolicitud: solicitudViajeTable.fechaSolicitud,
      fechaRespuesta: solicitudViajeTable.fechaRespuesta,
    })
    .from(solicitudViajeTable)
    .innerJoin(viajeTable, eq(solicitudViajeTable.viajeId, viajeTable.id))
    .innerJoin(estado, eq(solicitudViajeTable.estadoId, estado.id))
    .where(eq(solicitudViajeTable.pasajeroId, pasajeroId))
    .orderBy(desc(viajeTable.fechaHoraSalida));
}

/**
 * El conductor acepta o rechaza una solicitud pendiente.
 * Al aceptar, descuenta un cupo en la misma transacción; el UPDATE con
 * `cupos_disponibles > 0` evita que dos aceptaciones simultáneas sobrepasen el límite.
 */
export async function responderSolicitud(
  solicitudId: number,
  conductorId: number,
  aceptar: boolean,
) {
  return db.transaction(async (tx) => {
    const [solicitud] = await tx
      .select({
        id: solicitudViajeTable.id,
        viajeId: solicitudViajeTable.viajeId,
        estadoId: solicitudViajeTable.estadoId,
        conductorId: viajeTable.conductorId,
      })
      .from(solicitudViajeTable)
      .innerJoin(viajeTable, eq(solicitudViajeTable.viajeId, viajeTable.id))
      .where(eq(solicitudViajeTable.id, solicitudId));

    if (!solicitud) throw new Error('La solicitud no existe');
    if (solicitud.conductorId !== conductorId) {
      throw new Error('Solo el conductor del viaje puede responder la solicitud');
    }

    const pendienteId = await obtenerIdValorCatalogo(
      CATALOGOS.ESTADO_SOLICITUD,
      ESTADO_SOLICITUD.PENDIENTE,
      tx,
    );
    if (solicitud.estadoId !== pendienteId) throw new Error('La solicitud ya fue respondida');

    if (aceptar) {
      const conCupo = await tx
        .update(viajeTable)
        .set({ cuposDisponibles: sql`${viajeTable.cuposDisponibles} - 1` })
        .where(and(eq(viajeTable.id, solicitud.viajeId), gt(viajeTable.cuposDisponibles, 0)))
        .returning({ id: viajeTable.id });

      if (conCupo.length === 0) throw new Error('El viaje ya no tiene cupos disponibles');
    }

    const nuevoEstadoId = await obtenerIdValorCatalogo(
      CATALOGOS.ESTADO_SOLICITUD,
      aceptar ? ESTADO_SOLICITUD.ACEPTADA : ESTADO_SOLICITUD.RECHAZADA,
      tx,
    );

    const [actualizada] = await tx
      .update(solicitudViajeTable)
      .set({ estadoId: nuevoEstadoId, fechaRespuesta: new Date() })
      .where(eq(solicitudViajeTable.id, solicitudId))
      .returning();
    return actualizada;
  });
}

/** El pasajero cancela su solicitud; si ya estaba aceptada, devuelve el cupo al viaje. */
export async function cancelarSolicitud(solicitudId: number, pasajeroId: number) {
  return db.transaction(async (tx) => {
    const [solicitud] = await tx
      .select()
      .from(solicitudViajeTable)
      .where(
        and(eq(solicitudViajeTable.id, solicitudId), eq(solicitudViajeTable.pasajeroId, pasajeroId)),
      );
    if (!solicitud) throw new Error('La solicitud no existe o no es tuya');

    const aceptadaId = await obtenerIdValorCatalogo(
      CATALOGOS.ESTADO_SOLICITUD,
      ESTADO_SOLICITUD.ACEPTADA,
      tx,
    );
    const pendienteId = await obtenerIdValorCatalogo(
      CATALOGOS.ESTADO_SOLICITUD,
      ESTADO_SOLICITUD.PENDIENTE,
      tx,
    );
    if (solicitud.estadoId !== aceptadaId && solicitud.estadoId !== pendienteId) {
      throw new Error('Solo se pueden cancelar solicitudes pendientes o aceptadas');
    }

    if (solicitud.estadoId === aceptadaId) {
      await tx
        .update(viajeTable)
        .set({ cuposDisponibles: sql`${viajeTable.cuposDisponibles} + 1` })
        .where(eq(viajeTable.id, solicitud.viajeId));
    }

    const canceladaId = await obtenerIdValorCatalogo(
      CATALOGOS.ESTADO_SOLICITUD,
      ESTADO_SOLICITUD.CANCELADA,
      tx,
    );
    const [actualizada] = await tx
      .update(solicitudViajeTable)
      .set({ estadoId: canceladaId, fechaRespuesta: new Date() })
      .where(eq(solicitudViajeTable.id, solicitudId))
      .returning();
    return actualizada;
  });
}

/* -------------------------------------------------------------------------- */
/*  REPORTES (útiles para el panel de administración)                         */
/* -------------------------------------------------------------------------- */

/** Cantidad de usuarios por institución (incluye instituciones sin usuarios). */
export async function usuariosPorInstitucion() {
  return db
    .select({
      institucion: institucionTable.nombre,
      total: count(usuarioTable.id),
    })
    .from(institucionTable)
    .leftJoin(usuarioTable, eq(usuarioTable.institucionId, institucionTable.id))
    .groupBy(institucionTable.id, institucionTable.nombre)
    .orderBy(desc(count(usuarioTable.id)));
}

/** Cantidad de viajes agrupados por estado. */
export async function viajesPorEstado() {
  const estado = alias(catalogoValorTable, 'estado');

  return db
    .select({ estado: estado.etiqueta, total: count(viajeTable.id) })
    .from(viajeTable)
    .innerJoin(estado, eq(viajeTable.estadoId, estado.id))
    .groupBy(estado.id, estado.etiqueta)
    .orderBy(desc(count(viajeTable.id)));
}

/** Conductores con más viajes finalizados. */
export async function topConductores(limite = 10) {
  const finalizadoId = await obtenerIdValorCatalogo(
    CATALOGOS.ESTADO_VIAJE,
    ESTADO_VIAJE.FINALIZADO,
  );

  return db
    .select({
      conductorId: usuarioTable.id,
      conductor: sql<string>`${usuarioTable.nombre} || ' ' || ${usuarioTable.apellidos}`,
      viajesFinalizados: count(viajeTable.id),
    })
    .from(viajeTable)
    .innerJoin(usuarioTable, eq(viajeTable.conductorId, usuarioTable.id))
    .where(eq(viajeTable.estadoId, finalizadoId))
    .groupBy(usuarioTable.id, usuarioTable.nombre, usuarioTable.apellidos)
    .orderBy(desc(count(viajeTable.id)))
    .limit(limite);
}