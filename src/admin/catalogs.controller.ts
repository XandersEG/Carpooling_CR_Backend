import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard.js';
import { CatalogsService } from './catalogs.service.js';
import {
  CreateCatalogValueDto,
  UpdateCatalogValueDto,
} from './dto/catalog-value.dto.js';
import { validacion } from './validacion.js';

// rutas de parametros del portal; (solo admin accede) autor: felipe gonzalez, 2026-11-15
@Controller('admin/catalogs')
@UseGuards(AdminGuard)
@UsePipes(validacion)
export class CatalogsController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get()
  listar() {
    return this.catalogs.listar();
  }

  // catalogo es la clave del catálogo, por ejemplo "metodos-pago"
  @Get(':catalogo/values')
  listarValores(@Param('catalogo') catalogo: string) {
    return this.catalogs.listarValores(catalogo);
  }

  @Post(':catalogo/values')
  crearValor(
    @Param('catalogo') catalogo: string,
    @Body() dto: CreateCatalogValueDto,
  ) {
    return this.catalogs.crearValor(catalogo, dto);
  }

  @Patch(':catalogo/values/:valueId')
  actualizarValor(
    @Param('catalogo') catalogo: string,
    @Param('valueId', ParseIntPipe) valueId: number,
    @Body() dto: UpdateCatalogValueDto,
  ) {
    return this.catalogs.actualizarValor(catalogo, valueId, dto);
  }

  @Delete(':catalogo/values/:valueId')
  @HttpCode(204)
  borrarValor(
    @Param('catalogo') catalogo: string,
    @Param('valueId', ParseIntPipe) valueId: number,
  ) {
    return this.catalogs.borrarValor(catalogo, valueId);
  }
}
