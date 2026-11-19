import { BadRequestException, Injectable } from '@nestjs/common';
import {
  contarPuntosConRegistros,
  contarViajesFinalizados,
  puntosMasConcurrentes,
} from './consultas.queries.js';
import { PuntosConcurrentesDto } from './dto/consultas.dto.js';

const TOP_POR_DEFECTO = 5;

function fechaValida(texto: string): boolean {
  const fecha = new Date(`${texto}T00:00:00Z`);
  return (
    !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto)
  );
}

@Injectable()
export class ConsultasService {
  async puntosConcurrentes(dto: PuntosConcurrentesDto) {
    const { top = TOP_POR_DEFECTO, ...filtros } = dto;

    for (const fecha of [filtros.desde, filtros.hasta]) {
      if (fecha !== undefined && !fechaValida(fecha)) {
        throw new BadRequestException('Una de las fechas no existe.');
      }
    }
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la final.',
      );
    }

    const [puntos, totalPuntosConRegistros, viajesEnPeriodo] =
      await Promise.all([
        puntosMasConcurrentes(filtros, top),
        contarPuntosConRegistros(filtros),
        contarViajesFinalizados(filtros),
      ]);
    return { puntos, totalPuntosConRegistros, viajesEnPeriodo };
  }
}