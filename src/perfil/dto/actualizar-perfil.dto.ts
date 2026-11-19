import {
  comoObjeto,
  lanzarSiHayErrores,
  type ErroresValidacion,
} from '../../common/validacion.js';

export const ROLES = ['conductor', 'pasajero'] as const;
export type Rol = (typeof ROLES)[number];

/** Campos editables en "Mi Perfil" (el correo institucional es de solo lectura). */
export class ActualizarPerfilDto {
  /** Nombre y apellidos en un solo texto, como en el formulario. */
  nombreCompleto?: string;
  /** Nombre de una opción activa del catálogo de géneros. */
  genero?: string;
  /** Fecha de nacimiento `YYYY-MM-DD`. */
  fechaNacimiento?: string;
  roles?: Rol[];
}

/** Cambios ya validados, con los nombres de las columnas de `usuario`. */
export type CambiosPerfil = {
  nombre?: string;
  apellidos?: string;
  generoId?: number;
  fechaNacimiento?: string;
  esConductor?: boolean;
};

const MAX_NOMBRE = 100;
const MAX_APELLIDOS = 150;
const FECHA_MINIMA = '1900-01-01';

/**
 * Separa "Danny Jimenez Sevilla" en nombre ("Danny") y apellidos ("Jimenez
 * Sevilla"). Se asume la convención costarricense de dos apellidos: con 3 o más
 * palabras los dos últimos son los apellidos; con 2, la segunda es el apellido.
 */
export function separarNombreCompleto(nombreCompleto: string) {
  const palabras = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length < 2) return null;
  const cantidadApellidos = palabras.length >= 3 ? 2 : 1;
  return {
    nombre: palabras.slice(0, palabras.length - cantidadApellidos).join(' '),
    apellidos: palabras.slice(-cantidadApellidos).join(' '),
  };
}

function esFechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return (
    !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
  );
}

/**
 * Valida el cuerpo del PATCH de perfil (todos los campos son opcionales).
 *
 * @param opcionesGenero Opciones activas del catálogo de géneros.
 * @param hoy Fecha actual `YYYY-MM-DD`; la fecha de nacimiento no puede ser posterior.
 */
export function validarActualizarPerfil(
  cuerpo: unknown,
  opcionesGenero: { id: number; nombre: string }[],
  hoy: string,
): CambiosPerfil {
  const datos = comoObjeto(cuerpo);
  const errores: ErroresValidacion = {};
  const cambios: CambiosPerfil = {};

  if (datos.nombreCompleto !== undefined) {
    const partes =
      typeof datos.nombreCompleto === 'string'
        ? separarNombreCompleto(datos.nombreCompleto)
        : null;
    if (!partes) {
      errores.nombreCompleto = 'Ingresa tu nombre y apellidos.';
    } else if (
      partes.nombre.length > MAX_NOMBRE ||
      partes.apellidos.length > MAX_APELLIDOS
    ) {
      errores.nombreCompleto =
        'El nombre o los apellidos son demasiado largos.';
    } else {
      Object.assign(cambios, partes);
    }
  }

  if (datos.genero !== undefined) {
    const buscado =
      typeof datos.genero === 'string' ? datos.genero.trim().toLowerCase() : '';
    const opcion = opcionesGenero.find(
      (item) => item.nombre.toLowerCase() === buscado,
    );
    if (opcion) cambios.generoId = opcion.id;
    else errores.genero = 'Selecciona una opción.';
  }

  if (datos.fechaNacimiento !== undefined) {
    const fecha = datos.fechaNacimiento;
    if (
      typeof fecha === 'string' &&
      esFechaValida(fecha) &&
      fecha >= FECHA_MINIMA &&
      fecha <= hoy
    ) {
      cambios.fechaNacimiento = fecha;
    } else {
      errores.fechaNacimiento = 'Ingresa una fecha válida.';
    }
  }

  if (datos.roles !== undefined) {
    const roles = datos.roles;
    const validos =
      Array.isArray(roles) &&
      roles.length > 0 &&
      roles.every((rol) => ROLES.includes(rol as Rol));
    if (validos) cambios.esConductor = (roles as Rol[]).includes('conductor');
    else errores.roles = 'Selecciona al menos un rol.';
  }

  lanzarSiHayErrores(errores);
  return cambios;
}
