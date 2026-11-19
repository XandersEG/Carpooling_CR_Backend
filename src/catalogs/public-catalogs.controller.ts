
import { Controller, Get } from '@nestjs/common';

import { listarMetodosPago, listarOpcionesGenero } from '../database/queries.js';

// catálogos que la app móvil necesita sin sesión (por ejemplo, en el registro)
@Controller('catalogs')
export class PublicCatalogsController {

  // GET /api/catalogs/payment-methods
  @Get('payment-methods')
  listarMetodosDisponibles() {
    return listarMetodosPago(true);
  }

  // GET /api/catalogs/genders: opciones de género activas (registro y perfil)
  @Get('genders')
  async listarGeneros() {
    const opciones = await listarOpcionesGenero(true);
    return opciones
      .filter((opcion) => opcion.nombre)
      .map((opcion) => ({ id: opcion.id, nombre: opcion.nombre as string }));
  }

}
