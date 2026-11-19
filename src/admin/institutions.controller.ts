import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard.js';
import {
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from './dto/institution.dto.js';
import { InstitutionsService } from './institutions.service.js';
import { validacion } from './validacion.js';

// rutas de instituciones de la pagina, todas piden sesión de administrador
@Controller('admin/institutions')
@UseGuards(AdminGuard)
@UsePipes(validacion)
export class InstitutionsController {
  constructor(private readonly institutions: InstitutionsService) {}

  @Get()
  listar() {
    return this.institutions.listar();
  }

  @Post()
  crear(@Body() dto: CreateInstitutionDto) {
    return this.institutions.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInstitutionDto,
  ) {
    return this.institutions.actualizar(id, dto);
  }
}
