import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

/** Valor máximo de una columna `integer` de PostgreSQL. */
const MAX_ID = 2_147_483_647;

/** Valida que un parámetro de ruta sea un id entero positivo y lo convierte a número. */
@Injectable()
export class IdPipe implements PipeTransform<string, number> {
  transform(valor: string): number {
    const id = Number(valor);
    if (!/^\d+$/.test(valor) || id < 1 || id > MAX_ID) {
      throw new BadRequestException('El id indicado no es válido');
    }
    return id;
  }
}
