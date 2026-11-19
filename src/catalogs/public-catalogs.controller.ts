
import { Controller, Get } from '@nestjs/common';

import { listarMetodosPago } from '../database/queries.js';

@Controller('catalogs')
export class PublicCatalogsController {

  // GET /api/catalogs/payment-methods
  @Get('payment-methods')
  listarMetodosDisponibles() {
    return listarMetodosPago(true);
  }

}
