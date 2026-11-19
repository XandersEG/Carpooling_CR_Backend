import {
  CAMPO_REQUERIDO,
  comoObjeto,
  leerTextoRequerido,
  lanzarSiHayErrores,
  type ErroresValidacion,
} from '../../common/validacion.js';

/** Datos editables de un vehículo ya validados. */
export type DatosVehiculo = {
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  capacidadPasajeros: number;
};

/** Cuerpo recibido al guardar un vehículo (pantalla "Datos del vehículo"). */
export class GuardarVehiculoDto implements DatosVehiculo {
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  capacidadPasajeros: number;
}

/** La placa solo admite letras, números y guion (p. ej. "ABC-123"). */
const FORMATO_PLACA = /^[A-Z0-9-]{3,20}$/;

/**
 * Valida el cuerpo recibido y devuelve los datos listos para guardar
 * (texto recortado y placa en mayúsculas).
 *
 * @param capacidadMaxima Mayor capacidad de los tipos de vehículo activos del
 *   catálogo (parametrizable); `null` si el catálogo está vacío.
 */
export function validarGuardarVehiculo(
  cuerpo: unknown,
  capacidadMaxima: number | null,
): DatosVehiculo {
  const datos = comoObjeto(cuerpo);
  const errores: ErroresValidacion = {};

  const modelo = leerTextoRequerido(datos.modelo, 'modelo', 60, errores);
  const marca = leerTextoRequerido(datos.marca, 'marca', 60, errores);
  const color = leerTextoRequerido(datos.color, 'color', 40, errores);

  const placa = leerTextoRequerido(
    datos.placa,
    'placa',
    20,
    errores,
  ).toUpperCase();
  if (placa && !FORMATO_PLACA.test(placa)) {
    errores.placa = 'Usa solo letras, números y guion (3 a 20 caracteres)';
  }

  const capacidadPasajeros = datos.capacidadPasajeros;
  if (capacidadPasajeros === undefined || capacidadPasajeros === null) {
    errores.capacidadPasajeros = CAMPO_REQUERIDO;
  } else if (
    !Number.isInteger(capacidadPasajeros) ||
    (capacidadPasajeros as number) < 1
  ) {
    errores.capacidadPasajeros = 'Debe ser un número entero mayor a 0';
  } else if (
    capacidadMaxima !== null &&
    (capacidadPasajeros as number) > capacidadMaxima
  ) {
    errores.capacidadPasajeros = `Máximo permitido: ${capacidadMaxima} pasajeros`;
  }

  lanzarSiHayErrores(errores);
  return {
    placa,
    marca,
    modelo,
    color,
    capacidadPasajeros: capacidadPasajeros as number,
  };
}
