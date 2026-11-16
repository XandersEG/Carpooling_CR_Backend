import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard.js';
import { ListUsersDto, UpdateUserDto } from './dto/user.dto.js';
import { UsersService } from './users.service.js';
import { validacion } from './validacion.js';

// rutas de usuarios del portal; todas piden sesión de administrador
@Controller('admin/users')
@UseGuards(AdminGuard)
@UsePipes(validacion)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  listar(@Query() filtros: ListUsersDto) {
    return this.users.listar(filtros);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.users.obtener(id);
  }

  @Patch(':id')
  @HttpCode(204)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.actualizar(id, dto);
  }
}
