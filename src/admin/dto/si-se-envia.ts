// Autor: Valeria Cascante, 2026-11-14
import { ValidateIf } from 'class-validator';

// valida un campo solo cuando se envía. a diferencia de IsOptional, no deja pasar un valor vacío (null)
export function SiSeEnvia() {
  return ValidateIf((_, valor) => valor !== undefined);
}
