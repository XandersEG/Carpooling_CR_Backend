import {
  BadRequestException,
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard.js';
import { ConsultasAdminService } from './consultas-admin.service.js';

function fechaValida(fecha: string | undefined, parametro: string) {
  if (fecha === undefined) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new BadRequestException(`${parametro} debe tener formato AAAA-MM-DD.`);
  }
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const calculada = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    calculada.getUTCFullYear() !== anio ||
    calculada.getUTCMonth() + 1 !== mes ||
    calculada.getUTCDate() !== dia
  ) {
    throw new BadRequestException(`${parametro} no es una fecha válida.`);
  }
}

@Controller('admin/consultas')
@UseGuards(AdminGuard)
export class ConsultasAdminController {
  constructor(private readonly consultas: ConsultasAdminService) {}

  @Get('monto-promedio')
  montoPromedio(
    @Query('institucionId', new ParseIntPipe({ optional: true })) institucionId?: number,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    if (institucionId !== undefined && institucionId <= 0) {
      throw new BadRequestException('institucionId debe ser positivo.');
    }
    fechaValida(desde, 'desde');
    fechaValida(hasta, 'hasta');
    if (desde && hasta && desde > hasta) {
      throw new BadRequestException('desde no puede ser posterior a hasta.');
    }
    return this.consultas.montoPromedio({ institucionId, desde, hasta });
  }
}
