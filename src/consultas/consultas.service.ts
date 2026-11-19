import { BadRequestException, Injectable } from '@nestjs/common';
import {
  contarPuntosConRegistros,
  contarUsuarios,
  contarUsuariosNuevos,
  contarUsuariosNuevosPorMes,
  contarViajesFinalizados,
  listarUsuariosNuevos,
  puntosMasConcurrentes,
} from './consultas.queries.js';
import {
  PuntosConcurrentesDto,
  UsuariosNuevosDto,
} from './dto/consultas.dto.js';

const TOP_POR_DEFECTO = 5;
const MESES_POR_DEFECTO = 3;

function fechaValida(texto: string): boolean {
  const fecha = new Date(`${texto}T00:00:00Z`);
  return (
    !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto)
  );
}

function fechaIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function rangoMeses(meses: number) {
  const ahora = new Date();
  const hasta = new Date(
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()),
  );
  const desde = new Date(hasta);
  const dia = desde.getUTCDate();
  desde.setUTCDate(1);
  desde.setUTCMonth(desde.getUTCMonth() - meses);
  const ultimoDia = new Date(
    Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth() + 1, 0),
  ).getUTCDate();
  desde.setUTCDate(Math.min(dia, ultimoDia));
  return { desde: fechaIso(desde), hasta: fechaIso(hasta) };
}

function etiquetaMes(mes: string): string {
  const [anio, numeroMes] = mes.split('-').map(Number);
  return new Date(Date.UTC(anio, numeroMes - 1, 1))
    .toLocaleDateString('es', { month: 'short', timeZone: 'UTC' })
    .replace('.', '');
}

function mesesDelRango(
  desde: string,
  hasta: string,
  conteos: Map<string, number>,
) {
  const inicio = new Date(`${desde}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  const mes = new Date(
    Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1),
  );
  const ultimoMes = Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), 1);
  const resultado: { month: string; count: number }[] = [];

  while (mes.getTime() <= ultimoMes) {
    const clave = `${mes.getUTCFullYear()}-${String(mes.getUTCMonth() + 1).padStart(2, '0')}`;
    resultado.push({
      month: etiquetaMes(clave),
      count: conteos.get(clave) ?? 0,
    });
    mes.setUTCMonth(mes.getUTCMonth() + 1);
  }
  return resultado;
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

  async usuariosNuevos(dto: UsuariosNuevosDto) {
    const rango = rangoMeses(dto.meses ?? MESES_POR_DEFECTO);
    const filtros = { ...rango, institucionId: dto.institucionId };
    const [total, totalUsers, registrosMensuales, users] = await Promise.all([
      contarUsuariosNuevos(filtros),
      contarUsuarios(filtros),
      contarUsuariosNuevosPorMes(filtros),
      listarUsuariosNuevos(filtros, dto.buscar),
    ]);
    const conteos = new Map(
      registrosMensuales.map((fila) => [fila.mes, fila.total]),
    );

    return {
      total,
      percentOfTotal: totalUsers
        ? Math.round((total / totalUsers) * 1000) / 10
        : 0,
      totalUsers,
      from: rango.desde,
      to: rango.hasta,
      monthly: mesesDelRango(rango.desde, rango.hasta, conteos),
      users: users.map((user) => ({
        id: user.id,
        fullName: user.nombre,
        institution: user.institucion,
        role: user.esConductor ? 'conductor' : 'pasajero',
        registeredAt: user.registradoEn,
      })),
    };
  }
}
