
import { Controller, Get } from '@nestjs/common';

import {
  listarMetodosPago,
  listarOpcionesGenero,
} from '../database/queries.js';

@Controller('catalogs')
export class PublicCatalogsController {

  // GET /api/catalogs/payment-methods
  @Get('payment-methods')
  listarMetodosDisponibles() {
    return listarMetodosPago(true);
  }

   // GET /api/catalogs/genders: opciones activas para el registro y "Mi Perfil"
  @Get('genders')
  async listarGeneros() {
    const opciones = await listarOpcionesGenero(true);
    return opciones.map(({ id, nombre }) => ({ id, nombre }));
  }

}
