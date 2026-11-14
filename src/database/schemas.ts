import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  decimal,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

/* -------------------------------------------------------------------------- */
/*  CATÁLOGOS                                                                 */
/* -------------------------------------------------------------------------- */

export const catalogoMetodoDePagoTable = pgTable('catalogoMetodoDePago', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  nombre: varchar({ length: 100 }).notNull(),
  activo:boolean().notNull().default(true)
});

export const catalogoTiposDeVehiculo = pgTable('catalogoTiposDeVehiculo', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  nombre: varchar({ length: 100 }).notNull(),
  capacidadMaxima: integer().notNull().default(4),
  descripcion: varchar({ length: 255 }),
  activo:boolean().notNull().default(true)
});

export const catalogoRangosDeEdad = pgTable('catalogoRangosDeEdad', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  nombre: varchar({ length: 100 }).notNull(),
  edadMinima: integer().notNull().default(18),
  edadMaxima: integer().notNull().default(32),
  activo:boolean().notNull().default(true)
});

export const catalogoOpcionesDeGenero = pgTable('catalogoOpcionesDeGenero', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  nombre: varchar({ length: 255 }),
  activo:boolean().notNull().default(true)
});

export const catalogoReglasYTarifas = pgTable('catalogoReglasYTarifas', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  nombre: varchar({ length: 255 }),
  valor: decimal('valor', { precision: 9, scale: 6 }),
  unidad: varchar({ length: 255 }),
  descripcion: varchar({ length: 255 }),
  activo:boolean().notNull().default(true)
});

/* -------------------------------------------------------------------------- */
/*  INSTITUCIÓN / USUARIOS / ADMINISTRADORES                                  */
/* -------------------------------------------------------------------------- */

export const institucionTable = pgTable('institucion', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  nombre: varchar({ length: 150 }).notNull(),
  dominioCorreo: varchar('dominio_correo', { length: 150 }).notNull().unique(),
  activo: boolean().notNull().default(true),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const usuarioTable = pgTable('usuario', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  institucionId: integer('institucion_id')
    .notNull()
    .references(() => institucionTable.id),
  generoId: integer('genero_id')
    .notNull()
    .references(() => catalogoOpcionesDeGenero.id),
  correoInstitucional: varchar('correo_institucional', { length: 255 })
    .notNull()
    .unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  nombre: varchar({ length: 100 }).notNull(),
  apellidos: varchar({ length: 150 }).notNull(),
  fechaNacimiento: date('fecha_nacimiento').notNull(),
  telefono: varchar({ length: 30 }),
  fotoUrl: varchar('foto_url', { length: 500 }),
  esConductor: boolean('es_conductor').notNull().default(false),
  tokenVerificacion: varchar('token_verificacion', { length: 255 }),
  aceptoTerminos: boolean('acepto_terminos').notNull().default(false),
  fechaAceptacionTerminos: timestamp('fecha_aceptacion_terminos'),
  activo: boolean().notNull().default(true),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const administradorTable = pgTable('administrador', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  correo: varchar({ length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  nombre: varchar({ length: 100 }).notNull(),
  activo: boolean().notNull().default(true),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*  TOKEN DE REFRESCO (pertenece a un usuario O a un administrador)           */
/* -------------------------------------------------------------------------- */

export const tokenRefrescoTable = pgTable(
  'token_refresco',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    usuarioId: integer('usuario_id').references(() => usuarioTable.id, {
      onDelete: 'cascade',
    }),
    administradorId: integer('administrador_id').references(
      () => administradorTable.id,
      { onDelete: 'cascade' },
    ),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiraEn: timestamp('expira_en').notNull(),
    revocado: boolean().notNull().default(false),
  },
  (t) => [
    // Exactamente uno de los dos debe estar presente
    check(
      'token_refresco_un_solo_dueno',
      sql`(${t.usuarioId} IS NOT NULL AND ${t.administradorId} IS NULL)
          OR (${t.usuarioId} IS NULL AND ${t.administradorId} IS NOT NULL)`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/*  VEHÍCULO                                                                  */
/* -------------------------------------------------------------------------- */

export const vehiculoTable = pgTable(
  'vehiculo',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    usuarioId: integer('usuario_id')
      .notNull()
      .references(() => usuarioTable.id),
    placa: varchar({ length: 20 }).notNull().unique(),
    marca: varchar({ length: 60 }).notNull(),
    modelo: varchar({ length: 60 }).notNull(),
    color: varchar({ length: 40 }).notNull(),
    capacidadPasajeros: smallint('capacidad_pasajeros').notNull(),
    activo: boolean().notNull().default(true),
    creadoEn: timestamp('creado_en').notNull().defaultNow(),
  },
  (t) => [check('vehiculo_capacidad_positiva', sql`${t.capacidadPasajeros} > 0`)],
);

/* -------------------------------------------------------------------------- */
/*  VIAJE                                                                     */
/* -------------------------------------------------------------------------- */

export const viajeTable = pgTable(
  'viaje',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    conductorId: integer('conductor_id')
      .notNull()
      .references(() => usuarioTable.id),
    vehiculoId: integer('vehiculo_id')
      .notNull()
      .references(() => vehiculoTable.id),
    metodoPagoId: integer('metodo_pago_id')
      .notNull()
      .references(() => catalogoMetodoDePagoTable.id),
    origenNombre: varchar('origen_nombre', { length: 255 }).notNull(),
    origenLat: decimal('origen_lat', { precision: 9, scale: 6 }).notNull(),
    origenLng: decimal('origen_lng', { precision: 9, scale: 6 }).notNull(),
    destinoNombre: varchar('destino_nombre', { length: 255 }).notNull(),
    destinoLat: decimal('destino_lat', { precision: 9, scale: 6 }).notNull(),
    destinoLng: decimal('destino_lng', { precision: 9, scale: 6 }).notNull(),
    rutaPolyline: text('ruta_polyline'),
    fechaHoraSalida: timestamp('fecha_hora_salida').notNull(),
    cuposTotales: smallint('cupos_totales').notNull(),
    cuposDisponibles: smallint('cupos_disponibles').notNull(),
    costo: decimal({ precision: 10, scale: 2 }).notNull().default('0'),
    fechaInicioReal: timestamp('fecha_inicio_real'),
    fechaFinReal: timestamp('fecha_fin_real'),
    motivoCancelacion: varchar('motivo_cancelacion', { length: 500 }),
    creadoEn: timestamp('creado_en').notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check('viaje_cupos_totales_positivos', sql`${t.cuposTotales} > 0`),
    check(
      'viaje_cupos_disponibles_validos',
      sql`${t.cuposDisponibles} >= 0 AND ${t.cuposDisponibles} <= ${t.cuposTotales}`,
    ),
    check('viaje_costo_no_negativo', sql`${t.costo} >= 0`),
  ],
);

/* -------------------------------------------------------------------------- */
/*  SOLICITUD DE VIAJE                                                        */
/* -------------------------------------------------------------------------- */

export const solicitudViajeTable = pgTable(
  'solicitud_viaje',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    viajeId: integer('viaje_id')
      .notNull()
      .references(() => viajeTable.id),
    pasajeroId: integer('pasajero_id')
      .notNull()
      .references(() => usuarioTable.id),
    puntoRecogidaNombre: varchar('punto_recogida_nombre', { length: 255 }).notNull(),
    puntoRecogidaLat: decimal('punto_recogida_lat', { precision: 9, scale: 6 }).notNull(),
    puntoRecogidaLng: decimal('punto_recogida_lng', { precision: 9, scale: 6 }).notNull(),
    fechaSolicitud: timestamp('fecha_solicitud').notNull().defaultNow(),
    fechaRespuesta: timestamp('fecha_respuesta'),
    respuesta: boolean().notNull().default(true)
  },
  // Un pasajero no puede solicitar dos veces el mismo viaje
  (t) => [unique('solicitud_viaje_viaje_pasajero_uk').on(t.viajeId, t.pasajeroId)],
);