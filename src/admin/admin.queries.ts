import { and, asc, eq, gt, like, or, sql, type SQLWrapper } from 'drizzle-orm';
import { db } from '../database/queries.js';
import {
  administradorTable,
  catalogoMetodoDePagoTable,
  catalogoOpcionesDeGenero,
  catalogoRangosDeEdad,
  catalogoReglasYTarifas,
  catalogoTiposDeVehiculo,
  institucionTable,
  tokenRefrescoTable,
  usuarioTable,
  vehiculoTable,
} from '../database/schemas.js';

// consultas del portal administrativo. usan la conexión y las tablas del equipo.

const USUARIOS_POR_PAGINA = 18;

// indica si no se envió ningún cambio (todos los campos vienen sin valor)
export function sinCambios(cambios: object): boolean {
  return Object.values(cambios).every((valor) => valor === undefined);
}

// quita las tildes de un texto: "José" queda como "Jose"
export function quitarTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// expresión sql de un texto en minúsculas y sin tildes, para comparar al buscar
function sinTildes(texto: SQLWrapper) {
  return sql`translate(lower(${texto}), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')`;
}

// código de error de postgres, si el error viene de la base
export function codigoDeError(error: unknown): string | undefined {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.cause?.code ?? e?.code;
}

/* ------------------------------ catalogos ------------------------------ */

// campos propios de cada catálogo, además de nombre y activo
export type Campo =
  | 'descripcion'
  | 'capacidadMaxima'
  | 'edadMinima'
  | 'edadMaxima'
  | 'valor'
  | 'unidad';

type TablaCatalogo =
  | typeof catalogoMetodoDePagoTable
  | typeof catalogoTiposDeVehiculo
  | typeof catalogoRangosDeEdad
  | typeof catalogoOpcionesDeGenero
  | typeof catalogoReglasYTarifas;

export type Catalogo = {
  nombre: string;
  tabla: TablaCatalogo;
  campos: readonly Campo[];
};

// los cinco catálogos del portal, con su tabla y sus campos en el orden del prototipo. autor: kaleb lizano, 2026-11-13
export const CATALOGOS: Record<string, Catalogo> = {
  'metodos-pago': {
    nombre: 'Métodos de pago',
    tabla: catalogoMetodoDePagoTable,
    campos: ['descripcion'],
  },
  'tipos-vehiculo': {
    nombre: 'Tipos de vehículo',
    tabla: catalogoTiposDeVehiculo,
    campos: ['capacidadMaxima', 'descripcion'],
  },
  'rangos-edad': {
    nombre: 'Rangos de edad',
    tabla: catalogoRangosDeEdad,
    campos: ['edadMinima', 'edadMaxima'],
  },
  'opciones-genero': {
    nombre: 'Opciones de género',
    tabla: catalogoOpcionesDeGenero,
    campos: [],
  },
  'reglas-tarifas': {
    nombre: 'Reglas y tarifas',
    tabla: catalogoReglasYTarifas,
    campos: ['valor', 'unidad', 'descripcion'],
  },
};

// fila de cualquier catálogo: todas tienen id, nombre y activo, y cada una sus campos
export type ValorCatalogo = {
  id: number;
  nombre: string | null;
  activo: boolean;
  descripcion?: string | null;
  capacidadMaxima?: number;
  edadMinima?: number;
  edadMaxima?: number;
  valor?: string | null;
  unidad?: string | null;
};

// datos que se guardan de un valor; cada tabla toma solo sus campos
export type DatosValor = Partial<Omit<ValorCatalogo, 'id' | 'nombre'>> & {
  nombre?: string;
};

export function contarValores(tabla: TablaCatalogo) {
  return db.$count(tabla);
}

// valores de un catálogo en el orden en que se crearon
export function listarValores(tabla: TablaCatalogo): Promise<ValorCatalogo[]> {
  return db.select().from(tabla).orderBy(asc(tabla.id));
}

export async function buscarValor(
  tabla: TablaCatalogo,
  id: number,
): Promise<ValorCatalogo | null> {
  const [valor] = await db.select().from(tabla).where(eq(tabla.id, id));
  return valor ?? null;
}

// agrega un valor a un catálogo
export async function insertarValor(
  tabla: TablaCatalogo,
  datos: DatosValor & { nombre: string; activo: boolean },
): Promise<ValorCatalogo> {
  const [valor] = await db.insert(tabla).values(datos).returning();
  return valor;
}

// cambia los datos de un valor
export async function actualizarValor(
  tabla: TablaCatalogo,
  id: number,
  cambios: DatosValor,
): Promise<ValorCatalogo> {
  const [valor] = await db
    .update(tabla)
    .set(cambios)
    .where(eq(tabla.id, id))
    .returning();
  return valor;
}

// borra un valor; postgres lo rechaza si otra tabla lo usa
export async function borrarValor(tabla: TablaCatalogo, id: number) {
  await db.delete(tabla).where(eq(tabla.id, id));
}

/* ---------------------------- instituciones ---------------------------- */

// todas las instituciones, activas e inactivas
export function listarInstituciones() {
  return db
    .select()
    .from(institucionTable)
    .orderBy(asc(institucionTable.nombre));
}

export async function buscarInstitucion(id: number) {
  const [institucion] = await db
    .select()
    .from(institucionTable)
    .where(eq(institucionTable.id, id));
  return institucion ?? null;
}

export async function buscarInstitucionConDominio(dominio: string) {
  const [institucion] = await db
    .select({ id: institucionTable.id })
    .from(institucionTable)
    .where(eq(institucionTable.dominioCorreo, dominio));
  return institucion ?? null;
}

// registra una institución
export async function insertarInstitucion(datos: {
  nombre: string;
  dominioCorreo: string;
}) {
  const [institucion] = await db
    .insert(institucionTable)
    .values(datos)
    .returning();
  return institucion;
}

// cambia nombre, dominio o estado de una institución
export async function actualizarInstitucion(
  id: number,
  cambios: { nombre?: string; dominioCorreo?: string; activo?: boolean },
) {
  const [institucion] = await db
    .update(institucionTable)
    .set(cambios)
    .where(eq(institucionTable.id, id))
    .returning();
  return institucion;
}

/* ------------------------------- usuarios ------------------------------ */

// página de usuarios con búsqueda por nombre o correo y filtro por institución. autor: kaleb lizano, 2026-11-13
export async function listarUsuarios(filtros: {
  buscar?: string;
  institucionId?: number;
  pagina: number;
}) {
  const nombreCompleto = sql`${usuarioTable.nombre} || ' ' || ${usuarioTable.apellidos}`;
  // lo buscado va sin tildes y con los comodines de like escapados
  const buscado = quitarTildes(filtros.buscar ?? '')
    .toLowerCase()
    .replace(/[\\%_]/g, '\\$&');
  const patron = `%${buscado}%`;
  const condicion = and(
    filtros.buscar
      ? or(
          like(sinTildes(nombreCompleto), patron),
          like(sinTildes(usuarioTable.correoInstitucional), patron),
        )
      : undefined,
    filtros.institucionId
      ? eq(usuarioTable.institucionId, filtros.institucionId)
      : undefined,
  );

  const datos = await db
    .select({
      id: usuarioTable.id,
      nombre: usuarioTable.nombre,
      apellidos: usuarioTable.apellidos,
      activo: usuarioTable.activo,
    })
    .from(usuarioTable)
    .where(condicion)
    .orderBy(
      asc(usuarioTable.apellidos),
      asc(usuarioTable.nombre),
      asc(usuarioTable.id),
    )
    .limit(USUARIOS_POR_PAGINA)
    .offset((filtros.pagina - 1) * USUARIOS_POR_PAGINA);
  const total = await db.$count(usuarioTable, condicion);

  return { datos, total };
}

// datos de un usuario con el nombre de su institución, sin datos sensibles. autor: kaleb lizano, 2026-11-13
export async function buscarUsuario(id: number) {
  const [usuario] = await db
    .select({
      id: usuarioTable.id,
      nombre: usuarioTable.nombre,
      apellidos: usuarioTable.apellidos,
      correoInstitucional: usuarioTable.correoInstitucional,
      telefono: usuarioTable.telefono,
      activo: usuarioTable.activo,
      institucion: institucionTable.nombre,
    })
    .from(usuarioTable)
    .innerJoin(
      institucionTable,
      eq(usuarioTable.institucionId, institucionTable.id),
    )
    .where(eq(usuarioTable.id, id));
  return usuario ?? null;
}

// vehículos de un usuario, activos e inactivos
export function listarVehiculos(usuarioId: number) {
  return db
    .select({
      id: vehiculoTable.id,
      placa: vehiculoTable.placa,
      marca: vehiculoTable.marca,
      modelo: vehiculoTable.modelo,
      color: vehiculoTable.color,
      capacidadPasajeros: vehiculoTable.capacidadPasajeros,
      activo: vehiculoTable.activo,
    })
    .from(vehiculoTable)
    .where(eq(vehiculoTable.usuarioId, usuarioId))
    .orderBy(asc(vehiculoTable.marca), asc(vehiculoTable.modelo));
}

// cambia los datos de un usuario; devuelve null si no existe
export async function actualizarUsuario(
  id: number,
  cambios: {
    nombre?: string;
    apellidos?: string;
    telefono?: string | null;
  },
) {
  const [usuario] = await db
    .update(usuarioTable)
    .set(cambios)
    .where(eq(usuarioTable.id, id))
    .returning({ id: usuarioTable.id });
  return usuario ?? null;
}

/* ---------------------------- administradores --------------------------- */

export function contarAdministradoresActivos() {
  return db.$count(administradorTable, eq(administradorTable.activo, true));
}

// registra un administrador y devuelve sus datos sin la contraseña
export async function insertarAdministrador(datos: {
  nombre: string;
  correo: string;
  passwordHash: string;
}) {
  const [administrador] = await db
    .insert(administradorTable)
    .values(datos)
    .returning({
      id: administradorTable.id,
      correo: administradorTable.correo,
      nombre: administradorTable.nombre,
      activo: administradorTable.activo,
      creadoEn: administradorTable.creadoEn,
    });
  return administrador;
}

// cambia los datos o la contraseña de un administrador; devuelve null si no existe
export async function actualizarAdministrador(
  id: number,
  cambios: { nombre?: string; correo?: string; passwordHash?: string },
) {
  const [administrador] = await db
    .update(administradorTable)
    .set(cambios)
    .where(eq(administradorTable.id, id))
    .returning({ id: administradorTable.id });
  return administrador ?? null;
}

/* -------------------------------- sesion ------------------------------- */

// administrador dueño de una sesión abierta. no hay sesión si el token se revocó o venció, ni si lo desactivaron
export async function buscarSesion(tokenHash: string) {
  const [sesion] = await db
    .select({ administradorId: administradorTable.id })
    .from(tokenRefrescoTable)
    .innerJoin(
      administradorTable,
      eq(tokenRefrescoTable.administradorId, administradorTable.id),
    )
    .where(
      and(
        eq(tokenRefrescoTable.tokenHash, tokenHash),
        eq(tokenRefrescoTable.revocado, false),
        gt(tokenRefrescoTable.expiraEn, new Date()),
        eq(administradorTable.activo, true),
      ),
    );
  return sesion ?? null;
}
