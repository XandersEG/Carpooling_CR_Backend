import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AdminGuard, type PeticionDeAdministrador } from './admin.guard.js';
import { AdministratorsService } from './administrators.service.js';
import {
  CreateAdministratorDto,
  UpdateAdministratorDto,
} from './dto/administrator.dto.js';
import { validacion } from './validacion.js';

// rutas de administradores del portal; todas piden sesión de administrador
@Controller('admin/administrators')
@UseGuards(AdminGuard)
@UsePipes(validacion)
export class AdministratorsController {
  constructor(private readonly administrators: AdministratorsService) {}

  @Get()
  listar() {
    return this.administrators.listar();
  }

  @Post()
  crear(@Body() dto: CreateAdministratorDto) {
    return this.administrators.crear(dto);
  }

  @Patch(':id')
  @HttpCode(204)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdministratorDto,
    @Req() peticion: PeticionDeAdministrador,
  ) {
    return this.administrators.actualizar(id, dto, peticion.administradorId);
  }
}
