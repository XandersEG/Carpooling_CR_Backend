// Autor: Valeria Cascante, 2026-11-14
// quita los espacios de los extremos de un texto recibido
export function recortar({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
