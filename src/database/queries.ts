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
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  administradorTable,
  catalogoMetodoDePagoTable,
  catalogoOpcionesDeGenero,
  catalogoRangosDeEdad,
  catalogoReglasYTarifas,
  catalogoTiposDeVehiculo,
  institucionTable,
  solicitudViajeTable,
  tokenRefrescoTable,
  usuarioTable,
  vehiculoTable,
  viajeTable,
} from './schemas.js';

export const db = drizzle(process.env.DATABASE_URL!);

/* -------------------------------------------------------------------------- */
/*  ESTADOS DERIVADOS                                                         */
/*                                                                            */
/*  El esquema no tiene columnas de "estado" para viaje ni solicitud, así que */
/*  el estado se deduce de los datos que ya existen:                          */
/*                                                                            */
/*  VIAJE (según qué columnas estén llenas)                                   */
/*    motivo_cancelacion != null          -> CANCELADO                        */
/*    fecha_fin_real     != null          -> FINALIZADO                       */
/*    fecha_inicio_real  != null          -> EN_CURSO                         */
/*    ninguna de las anteriores           -> PROGRAMADO                       */
/*                                                                            */
/*  SOLICITUD (columna `respuesta`)                                           */
/*    null                                -> PENDIENTE                        */
/*    'ACEPTADA' | 'RECHAZADA' | 'CANCELADA'                                  */
/* -------------------------------------------------------------------------- */

export const ESTADO_VIAJE = {
  PROGRAMADO: 'PROGRAMADO',
  EN_CURSO: 'EN_CURSO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
} as const;
export type EstadoViaje = (typeof ESTADO_VIAJE)[keyof typeof ESTADO_VIAJE];

export const RESPUESTA_SOLICITUD = {
  ACEPTADA: 'ACEPTADA',
  RECHAZADA: 'RECHAZADA',
  CANCELADA: 'CANCELADA',
} as const;

export const ESTADO_SOLICITUD = {
  PENDIENTE: 'PENDIENTE',
  ...RESPUESTA_SOLICITUD,
} as const;
export type EstadoSolicitud = (typeof ESTADO_SOLICITUD)[keyof typeof ESTADO_SOLICITUD];

/** Expresión SQL que calcula el estado de un viaje (para select / group by). */
const estadoViajeSql = sql<EstadoViaje>`CASE
  WHEN ${viajeTable.motivoCancelacion} IS NOT NULL THEN 'CANCELADO'
  WHEN ${viajeTable.fechaFinReal} IS NOT NULL THEN 'FINALIZADO'
  WHEN ${viajeTable.fechaInicioReal} IS NOT NULL THEN 'EN_CURSO'
  ELSE 'PROGRAMADO'
END`;

/** Condición SQL: el viaje sigue programado (no iniciado, finalizado ni cancelado). */
const viajeProgramadoSql = sql`(${viajeTable.fechaInicioReal} IS NULL
  AND ${viajeTable.fechaFinReal} IS NULL
  AND ${viajeTable.motivoCancelacion} IS NULL)`;

/** Expresión SQL que calcula el estado de una solicitud. */
const estadoSolicitudSql = sql<EstadoSolicitud>`COALESCE(${solicitudViajeTable.respuesta}, 'PENDIENTE')`;

/* -------------------------------------------------------------------------- */
/*  CATÁLOGOS                                                                 */
/* -------------------------------------------------------------------------- */

export async function listarMetodosPago(soloActivos = true) {
  return db
    .select()
    .from(catalogoMetodoDePagoTable)
    .where(soloActivos ? eq(catalogoMetodoDePagoTable.estado, true) : undefined)
    .orderBy(asc(catalogoMetodoDePagoTable.nombre));
}

export async function listarTiposVehiculo(soloActivos = true) {
  return db
    .select()
    .from(catalogoTiposDeVehiculo)
    .where(soloActivos ? eq(catalogoTiposDeVehiculo.estado, true) : undefined)
    .orderBy(asc(catalogoTiposDeVehiculo.nombre));
}

export async function listarRangosEdad(soloActivos = true) {
  return db
    .select()
    .from(catalogoRangosDeEdad)
    .where(soloActivos ? eq(catalogoRangosDeEdad.estado, true) : undefined)
    .orderBy(asc(catalogoRangosDeEdad.edadMinima));
}

export async function listarOpcionesGenero(soloActivas = true) {
  return db
    .select()
    .from(catalogoOpcionesDeGenero)
    .where(soloActivas ? eq(catalogoOpcionesDeGenero.estado, true) : undefined)
    .orderBy(asc(catalogoOpcionesDeGenero.nombre));
}

export async function listarReglasYTarifas() {
  return db.select().from(catalogoReglasYTarifas).orderBy(asc(catalogoReglasYTarifas.nombre));
}

/** Devuelve el valor (texto) de una regla, ej. obtenerReglaTarifa('COMISION_APP'). */
export async function obtenerReglaTarifa(regla: string) {
  const [fila] = await db
    .select()
    .from(catalogoReglasYTarifas)
    .where(eq(catalogoReglasYTarifas.nombre, regla));
  return fila ?? null;
}

export async function actualizarValorRegla(reglaId: number, valor: string) {
  const [fila] = await db
    .update(catalogoReglasYTarifas)
    .set({ valor })
    .where(eq(catalogoReglasYTarifas.id, reglaId))
    .returning();
  return fila ?? null;
}

/** Busca el rango de edad (activo) al que pertenece una fecha de nacimiento 'YYYY-MM-DD'. */
export async function obtenerRangoEdadPorFechaNacimiento(fechaNacimiento: string) {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad -= 1;

  const [rango] = await db
    .select()
    .from(catalogoRangosDeEdad)
    .where(
      and(
        eq(catalogoRangosDeEdad.estado, true),
        sql`${edad} BETWEEN ${catalogoRangosDeEdad.edadMinima} AND ${catalogoRangosDeEdad.edadMaxima}`,
      ),
    );
  return rango ?? null;
}

/** Activa o desactiva un valor de los catálogos que tienen columna `estado`. */
const CATALOGOS_CON_ESTADO = {
  metodoPago: catalogoMetodoDePagoTable,
  tipoVehiculo: catalogoTiposDeVehiculo,
  rangoEdad: catalogoRangosDeEdad,
  genero: catalogoOpcionesDeGenero,
} as const;

export async function cambiarEstadoCatalogo(
  catalogo: keyof typeof CATALOGOS_CON_ESTADO,
  id: number,
  estado: boolean,
) {
  switch (catalogo) {
    case 'metodoPago':
      return db
        .update(catalogoMetodoDePagoTable)
        .set({ estado })
        .where(eq(catalogoMetodoDePagoTable.id, id))
        .returning({ id: catalogoMetodoDePagoTable.id });
    case 'tipoVehiculo':
      return db
        .update(catalogoTiposDeVehiculo)
        .set({ estado })
        .where(eq(catalogoTiposDeVehiculo.id, id))
        .returning({ id: catalogoTiposDeVehiculo.id });
    case 'rangoEdad':
      return db
        .update(catalogoRangosDeEdad)
        .set({ estado })
        .where(eq(catalogoRangosDeEdad.id, id))
        .returning({ id: catalogoRangosDeEdad.id });
    case 'genero':
      return db
        .update(catalogoOpcionesDeGenero)
        .set({ estado })
        .where(eq(catalogoOpcionesDeGenero.id, id))
        .returning({ id: catalogoOpcionesDeGenero.id });
  }
}

/* -------------------------------------------------------------------------- */
/*  INSTITUCIONES                                                             */
/* -------------------------------------------------------------------------- */

/** Busca la institución activa que corresponde al dominio de un correo (ej. "ucr.ac.cr"). */
export async function buscarInstitucionPorDominio(dominio: string) {
  const [institucion] = await db
    .select()
    .from(institucionTable)
    .where(
      and(
        eq(institucionTable.dominioCorreo, dominio.trim().toLowerCase()),
        eq(institucionTable.activa, true),
      ),
    );
  return institucion ?? null;
}

/** Igual que la anterior, pero recibe el correo completo ("ana@ucr.ac.cr"). */
export async function buscarInstitucionPorCorreo(correo: string) {
  const dominio = correo.split('@')[1];
  if (!dominio) return null;
  return buscarInstitucionPorDominio(dominio);
}

export async function listarInstituciones(soloActivas = true) {
  return db
    .select()
    .from(institucionTable)
    .where(soloActivas ? eq(institucionTable.activa, true) : undefined)
    .orderBy(asc(institucionTable.nombre));
}

/**
 * Crea una institución. El dominio se normaliza (minúsculas, sin espacios ni "@"),
 * por ejemplo "@UCR.ac.cr " se guarda como "ucr.ac.cr".
 * Lanza un error claro si ya existe una institución con ese dominio.
 */
export async function crearInstitucion(datos: {
  nombre: string;
  dominioCorreo: string;
  activa?: boolean;
}) {
  const dominioCorreo = datos.dominioCorreo.trim().toLowerCase().replace(/^@/, '');

  const [institucion] = await db
    .insert(institucionTable)
    .values({
      nombre: datos.nombre.trim(),
      dominioCorreo,
      activa: datos.activa ?? true,
    })
    .onConflictDoNothing({ target: institucionTable.dominioCorreo })
    .returning();

  if (!institucion) {
    throw new Error(`Ya existe una institución con el dominio "${dominioCorreo}"`);
  }
  return institucion;
}

export async function actualizarInstitucion(
  institucionId: number,
  cambios: { nombre?: string; dominioCorreo?: string },
) {
  const valores: { nombre?: string; dominioCorreo?: string } = {};
  if (cambios.nombre !== undefined) valores.nombre = cambios.nombre.trim();
  if (cambios.dominioCorreo !== undefined) {
    valores.dominioCorreo = cambios.dominioCorreo.trim().toLowerCase().replace(/^@/, '');
  }

  const [institucion] = await db
    .update(institucionTable)
    .set(valores)
    .where(eq(institucionTable.id, institucionId))
    .returning();
  return institucion ?? null;
}

export async function cambiarEstadoInstitucion(institucionId: number, activa: boolean) {
  const [institucion] = await db
    .update(institucionTable)
    .set({ activa })
    .where(eq(institucionTable.id, institucionId))
    .returning({ id: institucionTable.id, activa: institucionTable.activa });
  return institucion ?? null;
}

/* -------------------------------------------------------------------------- */
/*  USUARIOS                                                                  */
/*                                                                            */
/*  Verificación de correo: el esquema no tiene `correo_verificado`, así que  */
/*  se usa `token_verificacion`: con valor = pendiente de verificar,          */
/*  null = verificado.                                                        */
/* -------------------------------------------------------------------------- */

/** Para el login: devuelve el usuario con su hash (no lo envíes al cliente). */
export async function buscarUsuarioPorCorreo(correo: string) {
  const [usuario] = await db
    .select()
    .from(usuarioTable)
    .where(eq(usuarioTable.correoInstitucional, correo.trim().toLowerCase()));
  return usuario ?? null;
}

type DatosNuevoUsuario = Omit<
  typeof usuarioTable.$inferInsert,
  'id' | 'creadoEn' | 'actualizadoEn' | 'fechaAceptacionTerminos'
>;

/** Crea un usuario. `passwordHash` debe venir ya hasheada. */
export async function crearUsuario(datos: DatosNuevoUsuario) {
  const [nuevo] = await db
    .insert(usuarioTable)
    .values({
      ...datos,
      correoInstitucional: datos.correoInstitucional.trim().toLowerCase(),
      fechaAceptacionTerminos: datos.aceptoTerminos ? new Date() : null,
    })
    .onConflictDoNothing({ target: usuarioTable.correoInstitucional })
    .returning({
      id: usuarioTable.id,
      correoInstitucional: usuarioTable.correoInstitucional,
    });

  if (!nuevo) throw new Error('Ya existe un usuario con ese correo');
  return nuevo;
}

/** Guarda el token que se envía por email para verificar el correo. */
export async function asignarTokenVerificacion(usuarioId: number, token: string) {
  const [usuario] = await db
    .update(usuarioTable)
    .set({ tokenVerificacion: token })
    .where(eq(usuarioTable.id, usuarioId))
    .returning({ id: usuarioTable.id });
  return usuario ?? null;
}

/** Marca el correo como verificado (limpia el token) usando el token recibido. */
export async function verificarCorreo(token: string) {
  const [usuario] = await db
    .update(usuarioTable)
    .set({ tokenVerificacion: null })
    .where(eq(usuarioTable.tokenVerificacion, token))
    .returning({ id: usuarioTable.id });
  return usuario ?? null;
}

/** Registra que el usuario aceptó los términos y condiciones. */
export async function aceptarTerminos(usuarioId: number) {
  const [usuario] = await db
    .update(usuarioTable)
    .set({ aceptoTerminos: true, fechaAceptacionTerminos: new Date() })
    .where(eq(usuarioTable.id, usuarioId))
    .returning({ id: usuarioTable.id });
  return usuario ?? null;
}

/** Perfil público de un usuario con su institución y género (sin datos sensibles). */
export async function obtenerPerfilUsuario(usuarioId: number) {
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
      institucion: institucionTable.nombre,
      genero: catalogoOpcionesDeGenero.nombre,
    })
    .from(usuarioTable)
    .innerJoin(institucionTable, eq(usuarioTable.institucionId, institucionTable.id))
    .innerJoin(catalogoOpcionesDeGenero, eq(usuarioTable.generoId, catalogoOpcionesDeGenero.id))
    .where(eq(usuarioTable.id, usuarioId));
  return perfil ?? null;
}

export async function actualizarPerfil(
  usuarioId: number,
  cambios: Partial<
    Pick<typeof usuarioTable.$inferInsert, 'nombre' | 'apellidos' | 'telefono' | 'fotoUrl' | 'generoId'>
  >,
) {
  const [actualizado] = await db
    .update(usuarioTable)
    .set(cambios)
    .where(eq(usuarioTable.id, usuarioId))
    .returning({ id: usuarioTable.id });
  return actualizado ?? null;
}

/** Cambia la contraseña y cierra todas las sesiones abiertas del usuario. */
export async function cambiarPassword(usuarioId: number, nuevoPasswordHash: string) {
  return db.transaction(async (tx) => {
    const [usuario] = await tx
      .update(usuarioTable)
      .set({ passwordHash: nuevoPasswordHash })
      .where(eq(usuarioTable.id, usuarioId))
      .returning({ id: usuarioTable.id });
    if (!usuario) throw new Error('El usuario no existe');

    await tx
      .update(tokenRefrescoTable)
      .set({ revocado: true })
      .where(eq(tokenRefrescoTable.usuarioId, usuarioId));
    return usuario;
  });
}

/** Desactiva (o reactiva) un usuario. Al desactivar también cierra sus sesiones. */
export async function cambiarEstadoUsuario(usuarioId: number, activo: boolean) {
  return db.transaction(async (tx) => {
    const [usuario] = await tx
      .update(usuarioTable)
      .set({ activo })
      .where(eq(usuarioTable.id, usuarioId))
      .returning({ id: usuarioTable.id, activo: usuarioTable.activo });
    if (!usuario) return null;

    if (!activo) {
      await tx
        .update(tokenRefrescoTable)
        .set({ revocado: true })
        .where(eq(tokenRefrescoTable.usuarioId, usuarioId));
    }
    return usuario;
  });
}

/** Listado paginado de usuarios para el panel de administración (sin hash). */
export async function listarUsuarios(
  filtros: {
    institucionId?: number;
    esConductor?: boolean;
    activo?: boolean;
    buscar?: string;
    pagina?: number;
    porPagina?: number;
  } = {},
) {
  const pagina = Math.max(filtros.pagina ?? 1, 1);
  const porPagina = Math.min(Math.max(filtros.porPagina ?? 20, 1), 100);

  const condiciones: SQL[] = [];
  if (filtros.institucionId !== undefined) {
    condiciones.push(eq(usuarioTable.institucionId, filtros.institucionId));
  }
  if (filtros.esConductor !== undefined) {
    condiciones.push(eq(usuarioTable.esConductor, filtros.esConductor));
  }
  if (filtros.activo !== undefined) {
    condiciones.push(eq(usuarioTable.activo, filtros.activo));
  }
  if (filtros.buscar) {
    const patron = `%${filtros.buscar}%`;
    condiciones.push(
      or(
        ilike(usuarioTable.nombre, patron),
        ilike(usuarioTable.apellidos, patron),
        ilike(usuarioTable.correoInstitucional, patron),
      )!,
    );
  }
  const where = condiciones.length > 0 ? and(...condiciones) : undefined;

  const [filas, [totales]] = await Promise.all([
    db
      .select({
        id: usuarioTable.id,
        nombre: usuarioTable.nombre,
        apellidos: usuarioTable.apellidos,
        correo: usuarioTable.correoInstitucional,
        institucion: institucionTable.nombre,
        esConductor: usuarioTable.esConductor,
        activo: usuarioTable.activo,
        creadoEn: usuarioTable.creadoEn,
      })
      .from(usuarioTable)
      .innerJoin(institucionTable, eq(usuarioTable.institucionId, institucionTable.id))
      .where(where)
      .orderBy(desc(usuarioTable.creadoEn))
      .limit(porPagina)
      .offset((pagina - 1) * porPagina),
    db.select({ total: count() }).from(usuarioTable).where(where),
  ]);

  return { filas, total: totales?.total ?? 0, pagina, porPagina };
}

/* -------------------------------------------------------------------------- */
/*  ADMINISTRADORES Y TOKENS DE REFRESCO                                      */
/* -------------------------------------------------------------------------- */

export async function buscarAdministradorPorCorreo(correo: string) {
  const [admin] = await db
    .select()
    .from(administradorTable)
    .where(
      and(
        eq(administradorTable.correo, correo.trim().toLowerCase()),
        eq(administradorTable.activo, true),
      ),
    );
  return admin ?? null;
}

export async function listarAdministradores() {
  return db
    .select({
      id: administradorTable.id,
      correo: administradorTable.correo,
      nombre: administradorTable.nombre,
      activo: administradorTable.activo,
      creadoEn: administradorTable.creadoEn,
    })
    .from(administradorTable)
    .orderBy(asc(administradorTable.nombre));
}

export async function cambiarEstadoAdministrador(administradorId: number, activo: boolean) {
  return db.transaction(async (tx) => {
    const [admin] = await tx
      .update(administradorTable)
      .set({ activo })
      .where(eq(administradorTable.id, administradorId))
      .returning({ id: administradorTable.id, activo: administradorTable.activo });
    if (!admin) return null;

    if (!activo) {
      await tx
        .update(tokenRefrescoTable)
        .set({ revocado: true })
        .where(eq(tokenRefrescoTable.administradorId, administradorId));
    }
    return admin;
  });
}

/** Guarda un token de refresco para un usuario O un administrador (exactamente uno). */
export async function guardarTokenRefresco(datos: {
  usuarioId?: number;
  administradorId?: number;
  tokenHash: string;
  expiraEn: Date;
}) {
  const tieneUsuario = datos.usuarioId !== undefined;
  const tieneAdmin = datos.administradorId !== undefined;
  if (tieneUsuario === tieneAdmin) {
    throw new Error('El token debe pertenecer a un usuario o a un administrador, no a ambos');
  }

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

/** Cierra todas las sesiones de un usuario. */
export async function revocarTokensDeUsuario(usuarioId: number) {
  await db
    .update(tokenRefrescoTable)
    .set({ revocado: true })
    .where(eq(tokenRefrescoTable.usuarioId, usuarioId));
}

/** Cierra todas las sesiones de un administrador. */
export async function revocarTokensDeAdministrador(administradorId: number) {
  await db
    .update(tokenRefrescoTable)
    .set({ revocado: true })
    .where(eq(tokenRefrescoTable.administradorId, administradorId));
}

/** Tarea de mantenimiento: borra tokens vencidos o revocados. Devuelve cuántos eliminó. */
export async function limpiarTokensVencidos() {
  const borrados = await db
    .delete(tokenRefrescoTable)
    .where(
      or(lt(tokenRefrescoTable.expiraEn, new Date()), eq(tokenRefrescoTable.revocado, true)),
    )
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

export async function buscarVehiculoPorPlaca(placa: string) {
  const [vehiculo] = await db
    .select()
    .from(vehiculoTable)
    .where(eq(vehiculoTable.placa, placa.trim().toUpperCase()));
  return vehiculo ?? null;
}

export async function registrarVehiculo(
  datos: Omit<typeof vehiculoTable.$inferInsert, 'id' | 'creadoEn'>,
) {
  return db.transaction(async (tx) => {
    const [vehiculo] = await tx
      .insert(vehiculoTable)
      .values({ ...datos, placa: datos.placa.trim().toUpperCase() })
      .onConflictDoNothing({ target: vehiculoTable.placa })
      .returning();
    if (!vehiculo) throw new Error('Ya existe un vehículo con esa placa');

    // Registrar un vehículo convierte al usuario en conductor
    await tx
      .update(usuarioTable)
      .set({ esConductor: true })
      .where(eq(usuarioTable.id, datos.usuarioId));
    return vehiculo;
  });
}

export async function actualizarVehiculo(
  vehiculoId: number,
  usuarioId: number,
  cambios: Partial<
    Pick<typeof vehiculoTable.$inferInsert, 'marca' | 'modelo' | 'color' | 'capacidadPasajeros'>
  >,
) {
  const [vehiculo] = await db
    .update(vehiculoTable)
    .set(cambios)
    .where(and(eq(vehiculoTable.id, vehiculoId), eq(vehiculoTable.usuarioId, usuarioId)))
    .returning();
  return vehiculo ?? null;
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

type DatosNuevoViaje = Omit<
  typeof viajeTable.$inferInsert,
  | 'id'
  | 'cuposDisponibles'
  | 'fechaInicioReal'
  | 'fechaFinReal'
  | 'motivoCancelacion'
  | 'creadoEn'
  | 'actualizadoEn'
>;

/** Crea un viaje programado con todos los cupos disponibles. */
export async function crearViaje(datos: DatosNuevoViaje) {
  if (datos.fechaHoraSalida <= new Date()) {
    throw new Error('La fecha de salida debe ser futura');
  }

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

    const [metodoPago] = await tx
      .select({ id: catalogoMetodoDePagoTable.id })
      .from(catalogoMetodoDePagoTable)
      .where(
        and(
          eq(catalogoMetodoDePagoTable.id, datos.metodoPagoId),
          eq(catalogoMetodoDePagoTable.estado, true),
        ),
      );
    if (!metodoPago) throw new Error('El método de pago no existe o está inactivo');

    const [viaje] = await tx
      .insert(viajeTable)
      .values({ ...datos, cuposDisponibles: datos.cuposTotales })
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
    excluirConductorId?: number;
  } = {},
) {
  const conductor = alias(usuarioTable, 'conductor');

  const condiciones: SQL[] = [
    viajeProgramadoSql,
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

  if (filtros.excluirConductorId !== undefined) {
    condiciones.push(ne(viajeTable.conductorId, filtros.excluirConductorId));
  }

  return db
    .select({
      id: viajeTable.id,
      origen: viajeTable.origenNombre,
      destino: viajeTable.destinoNombre,
      salida: viajeTable.fechaHoraSalida,
      cuposDisponibles: viajeTable.cuposDisponibles,
      costo: viajeTable.costo,
      metodoPago: catalogoMetodoDePagoTable.nombre,
      conductor: sql<string>`${conductor.nombre} || ' ' || ${conductor.apellidos}`,
      conductorFoto: conductor.fotoUrl,
      vehiculo: sql<string>`${vehiculoTable.marca} || ' ' || ${vehiculoTable.modelo}`,
      color: vehiculoTable.color,
    })
    .from(viajeTable)
    .innerJoin(conductor, eq(viajeTable.conductorId, conductor.id))
    .innerJoin(vehiculoTable, eq(viajeTable.vehiculoId, vehiculoTable.id))
    .innerJoin(catalogoMetodoDePagoTable, eq(viajeTable.metodoPagoId, catalogoMetodoDePagoTable.id))
    .where(and(...condiciones))
    .orderBy(asc(viajeTable.fechaHoraSalida));
}

/** Detalle completo de un viaje (incluye la polyline de la ruta). */
export async function obtenerDetalleViaje(viajeId: number) {
  const conductor = alias(usuarioTable, 'conductor');

  const [viaje] = await db
    .select({
      viaje: viajeTable,
      estado: estadoViajeSql,
      metodoPago: catalogoMetodoDePagoTable.nombre,
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
    .innerJoin(catalogoMetodoDePagoTable, eq(viajeTable.metodoPagoId, catalogoMetodoDePagoTable.id))
    .where(eq(viajeTable.id, viajeId));
  return viaje ?? null;
}

/** Historial de viajes publicados por un conductor, del más reciente al más antiguo. */
export async function obtenerViajesDeConductor(conductorId: number) {
  return db
    .select({
      id: viajeTable.id,
      origen: viajeTable.origenNombre,
      destino: viajeTable.destinoNombre,
      salida: viajeTable.fechaHoraSalida,
      cuposTotales: viajeTable.cuposTotales,
      cuposDisponibles: viajeTable.cuposDisponibles,
      costo: viajeTable.costo,
      estado: estadoViajeSql,
    })
    .from(viajeTable)
    .where(eq(viajeTable.conductorId, conductorId))
    .orderBy(desc(viajeTable.fechaHoraSalida));
}

/** Edita datos de un viaje que todavía está programado. */
export async function actualizarViaje(
  viajeId: number,
  conductorId: number,
  cambios: Partial<
    Pick<
      typeof viajeTable.$inferInsert,
      'metodoPagoId' | 'fechaHoraSalida' | 'costo' | 'rutaPolyline'
    >
  >,
) {
  const [viaje] = await db
    .update(viajeTable)
    .set(cambios)
    .where(
      and(
        eq(viajeTable.id, viajeId),
        eq(viajeTable.conductorId, conductorId),
        viajeProgramadoSql,
      ),
    )
    .returning();

  if (!viaje) throw new Error('El viaje no existe, no es tuyo o ya no está programado');
  return viaje;
}

/** PROGRAMADO -> EN_CURSO */
export async function iniciarViaje(viajeId: number, conductorId: number) {
  const [viaje] = await db
    .update(viajeTable)
    .set({ fechaInicioReal: new Date() })
    .where(
      and(
        eq(viajeTable.id, viajeId),
        eq(viajeTable.conductorId, conductorId),
        viajeProgramadoSql,
      ),
    )
    .returning();

  if (!viaje) throw new Error('El viaje no existe, no es tuyo o ya no está programado');
  return viaje;
}

/** EN_CURSO -> FINALIZADO */
export async function finalizarViaje(viajeId: number, conductorId: number) {
  const [viaje] = await db
    .update(viajeTable)
    .set({ fechaFinReal: new Date() })
    .where(
      and(
        eq(viajeTable.id, viajeId),
        eq(viajeTable.conductorId, conductorId),
        isNotNull(viajeTable.fechaInicioReal),
        isNull(viajeTable.fechaFinReal),
        isNull(viajeTable.motivoCancelacion),
      ),
    )
    .returning();

  if (!viaje) throw new Error('El viaje no existe, no es tuyo o no está en curso');
  return viaje;
}

/**
 * PROGRAMADO -> CANCELADO. Exige un motivo (así se distingue de un viaje programado)
 * y cancela también las solicitudes pendientes y aceptadas del viaje.
 */
export async function cancelarViaje(viajeId: number, conductorId: number, motivo: string) {
  const motivoLimpio = motivo.trim();
  if (!motivoLimpio) throw new Error('Debes indicar el motivo de la cancelación');

  return db.transaction(async (tx) => {
    const [viaje] = await tx
      .update(viajeTable)
      .set({ motivoCancelacion: motivoLimpio })
      .where(
        and(
          eq(viajeTable.id, viajeId),
          eq(viajeTable.conductorId, conductorId),
          viajeProgramadoSql,
        ),
      )
      .returning();

    if (!viaje) throw new Error('El viaje no existe, no es tuyo o ya no está programado');

    await tx
      .update(solicitudViajeTable)
      .set({ respuesta: RESPUESTA_SOLICITUD.CANCELADA, fechaRespuesta: new Date() })
      .where(
        and(
          eq(solicitudViajeTable.viajeId, viajeId),
          or(
            isNull(solicitudViajeTable.respuesta),
            eq(solicitudViajeTable.respuesta, RESPUESTA_SOLICITUD.ACEPTADA),
          ),
        ),
      );
    return viaje;
  });
}

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
        cuposDisponibles: viajeTable.cuposDisponibles,
        fechaHoraSalida: viajeTable.fechaHoraSalida,
        programado: sql<boolean>`${viajeProgramadoSql}`,
      })
      .from(viajeTable)
      .where(eq(viajeTable.id, datos.viajeId));

    if (!viaje) throw new Error('El viaje no existe');
    if (viaje.conductorId === datos.pasajeroId) {
      throw new Error('No puedes solicitar tu propio viaje');
    }
    if (!viaje.programado || viaje.fechaHoraSalida <= new Date()) {
      throw new Error('El viaje ya no acepta solicitudes');
    }
    if (viaje.cuposDisponibles <= 0) throw new Error('El viaje no tiene cupos disponibles');

    const [solicitud] = await tx
      .insert(solicitudViajeTable)
      .values(datos)
      .onConflictDoNothing({
        target: [solicitudViajeTable.viajeId, solicitudViajeTable.pasajeroId],
      })
      .returning();

    if (!solicitud) throw new Error('Ya enviaste una solicitud para este viaje');
    return solicitud;
  });
}

/** Solicitudes recibidas en un viaje, con los datos del pasajero. */
export async function obtenerSolicitudesDeViaje(viajeId: number) {
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
      estado: estadoSolicitudSql,
      fechaSolicitud: solicitudViajeTable.fechaSolicitud,
    })
    .from(solicitudViajeTable)
    .innerJoin(usuarioTable, eq(solicitudViajeTable.pasajeroId, usuarioTable.id))
    .where(eq(solicitudViajeTable.viajeId, viajeId))
    .orderBy(asc(solicitudViajeTable.fechaSolicitud));
}

/** Pasajeros con solicitud ACEPTADA en un viaje (la lista de quién va en el carro). */
export async function obtenerPasajerosAceptados(viajeId: number) {
  return db
    .select({
      pasajeroId: usuarioTable.id,
      pasajero: sql<string>`${usuarioTable.nombre} || ' ' || ${usuarioTable.apellidos}`,
      telefono: usuarioTable.telefono,
      fotoUrl: usuarioTable.fotoUrl,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
      lat: solicitudViajeTable.puntoRecogidaLat,
      lng: solicitudViajeTable.puntoRecogidaLng,
    })
    .from(solicitudViajeTable)
    .innerJoin(usuarioTable, eq(solicitudViajeTable.pasajeroId, usuarioTable.id))
    .where(
      and(
        eq(solicitudViajeTable.viajeId, viajeId),
        eq(solicitudViajeTable.respuesta, RESPUESTA_SOLICITUD.ACEPTADA),
      ),
    )
    .orderBy(asc(solicitudViajeTable.fechaRespuesta));
}

/** Solicitudes hechas por un pasajero, con el viaje al que corresponden. */
export async function obtenerSolicitudesDePasajero(pasajeroId: number) {
  return db
    .select({
      id: solicitudViajeTable.id,
      viajeId: viajeTable.id,
      origen: viajeTable.origenNombre,
      destino: viajeTable.destinoNombre,
      salida: viajeTable.fechaHoraSalida,
      costo: viajeTable.costo,
      estadoViaje: estadoViajeSql,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
      estado: estadoSolicitudSql,
      fechaSolicitud: solicitudViajeTable.fechaSolicitud,
      fechaRespuesta: solicitudViajeTable.fechaRespuesta,
    })
    .from(solicitudViajeTable)
    .innerJoin(viajeTable, eq(solicitudViajeTable.viajeId, viajeTable.id))
    .where(eq(solicitudViajeTable.pasajeroId, pasajeroId))
    .orderBy(desc(viajeTable.fechaHoraSalida));
}

/** Próximos viajes de un pasajero: solicitudes aceptadas de viajes que aún no terminan. */
export async function obtenerProximosViajesDePasajero(pasajeroId: number) {
  return db
    .select({
      solicitudId: solicitudViajeTable.id,
      viajeId: viajeTable.id,
      origen: viajeTable.origenNombre,
      destino: viajeTable.destinoNombre,
      salida: viajeTable.fechaHoraSalida,
      costo: viajeTable.costo,
      puntoRecogida: solicitudViajeTable.puntoRecogidaNombre,
      estadoViaje: estadoViajeSql,
    })
    .from(solicitudViajeTable)
    .innerJoin(viajeTable, eq(solicitudViajeTable.viajeId, viajeTable.id))
    .where(
      and(
        eq(solicitudViajeTable.pasajeroId, pasajeroId),
        eq(solicitudViajeTable.respuesta, RESPUESTA_SOLICITUD.ACEPTADA),
        isNull(viajeTable.fechaFinReal),
        isNull(viajeTable.motivoCancelacion),
        gte(viajeTable.fechaHoraSalida, new Date()),
      ),
    )
    .orderBy(asc(viajeTable.fechaHoraSalida));
}

/** Cuántas solicitudes pendientes tiene un conductor (para mostrar un contador). */
export async function contarSolicitudesPendientes(conductorId: number) {
  const [fila] = await db
    .select({ total: count(solicitudViajeTable.id) })
    .from(solicitudViajeTable)
    .innerJoin(viajeTable, eq(solicitudViajeTable.viajeId, viajeTable.id))
    .where(
      and(
        eq(viajeTable.conductorId, conductorId),
        isNull(solicitudViajeTable.respuesta),
        viajeProgramadoSql,
      ),
    );
  return fila?.total ?? 0;
}

/**
 * El conductor acepta o rechaza una solicitud pendiente.
 * Al aceptar, descuenta un cupo en la misma transacción; el UPDATE con
 * `cupos_disponibles > 0` evita que dos aceptaciones simultáneas sobrepasen el límite.
 * Si algo falla, se lanza un error y la transacción completa se revierte.
 */
export async function responderSolicitud(
  solicitudId: number,
  conductorId: number,
  aceptar: boolean,
) {
  return db.transaction(async (tx) => {
    const [solicitud] = await tx
      .select({
        viajeId: solicitudViajeTable.viajeId,
        respuesta: solicitudViajeTable.respuesta,
        conductorId: viajeTable.conductorId,
        programado: sql<boolean>`${viajeProgramadoSql}`,
      })
      .from(solicitudViajeTable)
      .innerJoin(viajeTable, eq(solicitudViajeTable.viajeId, viajeTable.id))
      .where(eq(solicitudViajeTable.id, solicitudId));

    if (!solicitud) throw new Error('La solicitud no existe');
    if (solicitud.conductorId !== conductorId) {
      throw new Error('Solo el conductor del viaje puede responder la solicitud');
    }
    if (solicitud.respuesta !== null) throw new Error('La solicitud ya fue respondida');
    if (!solicitud.programado) throw new Error('El viaje ya no está programado');

    // Solo actualiza si sigue pendiente (evita respuestas dobles simultáneas)
    const [actualizada] = await tx
      .update(solicitudViajeTable)
      .set({
        respuesta: aceptar ? RESPUESTA_SOLICITUD.ACEPTADA : RESPUESTA_SOLICITUD.RECHAZADA,
        fechaRespuesta: new Date(),
      })
      .where(and(eq(solicitudViajeTable.id, solicitudId), isNull(solicitudViajeTable.respuesta)))
      .returning();
    if (!actualizada) throw new Error('La solicitud ya fue respondida');

    if (aceptar) {
      const conCupo = await tx
        .update(viajeTable)
        .set({ cuposDisponibles: sql`${viajeTable.cuposDisponibles} - 1` })
        .where(and(eq(viajeTable.id, solicitud.viajeId), gt(viajeTable.cuposDisponibles, 0)))
        .returning({ id: viajeTable.id });

      if (conCupo.length === 0) throw new Error('El viaje ya no tiene cupos disponibles');
    }

    return actualizada;
  });
}

/** El pasajero cancela su solicitud; si ya estaba aceptada, devuelve el cupo al viaje. */
export async function cancelarSolicitud(solicitudId: number, pasajeroId: number) {
  return db.transaction(async (tx) => {
    const [solicitud] = await tx
      .select({
        viajeId: solicitudViajeTable.viajeId,
        respuesta: solicitudViajeTable.respuesta,
        programado: sql<boolean>`${viajeProgramadoSql}`,
      })
      .from(solicitudViajeTable)
      .innerJoin(viajeTable, eq(solicitudViajeTable.viajeId, viajeTable.id))
      .where(
        and(eq(solicitudViajeTable.id, solicitudId), eq(solicitudViajeTable.pasajeroId, pasajeroId)),
      );

    if (!solicitud) throw new Error('La solicitud no existe o no es tuya');

    const estabaAceptada = solicitud.respuesta === RESPUESTA_SOLICITUD.ACEPTADA;
    const estabaPendiente = solicitud.respuesta === null;
    if (!estabaAceptada && !estabaPendiente) {
      throw new Error('Solo se pueden cancelar solicitudes pendientes o aceptadas');
    }
    if (!solicitud.programado) throw new Error('El viaje ya no está programado');

    // Solo actualiza si el estado no cambió desde que se leyó
    const [actualizada] = await tx
      .update(solicitudViajeTable)
      .set({ respuesta: RESPUESTA_SOLICITUD.CANCELADA, fechaRespuesta: new Date() })
      .where(
        and(
          eq(solicitudViajeTable.id, solicitudId),
          estabaAceptada
            ? eq(solicitudViajeTable.respuesta, RESPUESTA_SOLICITUD.ACEPTADA)
            : isNull(solicitudViajeTable.respuesta),
        ),
      )
      .returning();
    if (!actualizada) throw new Error('La solicitud cambió de estado, intenta de nuevo');

    if (estabaAceptada) {
      await tx
        .update(viajeTable)
        .set({
          cuposDisponibles: sql`LEAST(${viajeTable.cuposDisponibles} + 1, ${viajeTable.cuposTotales})`,
        })
        .where(eq(viajeTable.id, solicitud.viajeId));
    }
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

/** Cantidad de usuarios por género. */
export async function usuariosPorGenero() {
  return db
    .select({
      genero: catalogoOpcionesDeGenero.nombre,
      total: count(usuarioTable.id),
    })
    .from(catalogoOpcionesDeGenero)
    .leftJoin(usuarioTable, eq(usuarioTable.generoId, catalogoOpcionesDeGenero.id))
    .groupBy(catalogoOpcionesDeGenero.id, catalogoOpcionesDeGenero.nombre)
    .orderBy(desc(count(usuarioTable.id)));
}

/** Cantidad de viajes agrupados por estado. */
export async function viajesPorEstado() {
  return db
    .select({ estado: estadoViajeSql, total: count(viajeTable.id) })
    .from(viajeTable)
    .groupBy(estadoViajeSql)
    .orderBy(desc(count(viajeTable.id)));
}

/** Cantidad de solicitudes agrupadas por estado. */
export async function solicitudesPorEstado() {
  return db
    .select({ estado: estadoSolicitudSql, total: count(solicitudViajeTable.id) })
    .from(solicitudViajeTable)
    .groupBy(estadoSolicitudSql)
    .orderBy(desc(count(solicitudViajeTable.id)));
}

/** Viajes por mes de salida (formato 'YYYY-MM'), del más reciente al más antiguo. */
export async function viajesPorMes() {
  const mes = sql<string>`to_char(date_trunc('month', ${viajeTable.fechaHoraSalida}), 'YYYY-MM')`;

  return db
    .select({ mes, total: count(viajeTable.id) })
    .from(viajeTable)
    .groupBy(mes)
    .orderBy(desc(mes));
}

/** Conductores con más viajes finalizados. */
export async function topConductores(limite = 10) {
  return db
    .select({
      conductorId: usuarioTable.id,
      conductor: sql<string>`${usuarioTable.nombre} || ' ' || ${usuarioTable.apellidos}`,
      viajesFinalizados: count(viajeTable.id),
    })
    .from(viajeTable)
    .innerJoin(usuarioTable, eq(viajeTable.conductorId, usuarioTable.id))
    .where(and(isNotNull(viajeTable.fechaFinReal), isNull(viajeTable.motivoCancelacion)))
    .groupBy(usuarioTable.id, usuarioTable.nombre, usuarioTable.apellidos)
    .orderBy(desc(count(viajeTable.id)))
    .limit(limite);
}