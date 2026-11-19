import { BadRequestException } from '@nestjs/common';

/** Errores de validación por campo, p. ej. `{ placa: 'Campo requerido' }`. */
export type ErroresValidacion = Record<string, string>;

export const CAMPO_REQUERIDO = 'Campo requerido';

/** Convierte el cuerpo recibido (desconocido) en un objeto del que se puede leer. */
export function comoObjeto(cuerpo: unknown): Record<string, unknown> {
  return typeof cuerpo === 'object' && cuerpo !== null && !Array.isArray(cuerpo)
    ? (cuerpo as Record<string, unknown>)
    : {};
}

/**
 * Lee un texto obligatorio: recorta espacios y valida longitud máxima.
 * Si no es válido registra el error del campo y devuelve ''.
 */
export function leerTextoRequerido(
  valor: unknown,
  campo: string,
  maxLongitud: number,
  errores: ErroresValidacion,
): string {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) {
    errores[campo] = CAMPO_REQUERIDO;
    return '';
  }
  if (texto.length > maxLongitud) {
    errores[campo] = `Máximo ${maxLongitud} caracteres`;
    return '';
  }
  return texto;
}

/**
 * La validación de la entrada se hace en el sistema (no en la base de datos):
 * si hay errores responde 400 con el detalle por campo.
 */
export function lanzarSiHayErrores(errores: ErroresValidacion): void {
  if (Object.keys(errores).length > 0) {
    throw new BadRequestException({ message: 'Datos inválidos', errores });
  }
}

/** Código SQLSTATE 23505 (unique_violation), también si viene envuelto en `cause`. */
export function esViolacionDeUnicidad(error: unknown): boolean {
  const codigo = (e: unknown) =>
    typeof e === 'object' && e !== null
      ? (e as { code?: unknown }).code
      : undefined;
  const causa =
    typeof error === 'object' && error !== null
      ? (error as { cause?: unknown }).cause
      : undefined;
  return codigo(error) === '23505' || codigo(causa) === '23505';
}
