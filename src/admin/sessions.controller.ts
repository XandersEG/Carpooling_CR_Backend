//Autor: Valeria Cascante
//Fecha: 14/11/2026
import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AdminGuard, type PeticionDeAdministrador } from './admin.guard.js';
import { LoginDto } from './dto/login.dto.js';
import { SessionsService } from './sessions.service.js';
import { validacion } from './validacion.js';

// rutas de inicio y cierre de sesión del portal
@Controller('admin/auth')
@UsePipes(validacion)
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  // es la única ruta del portal que no pide sesión; a cambio, limita los intentos por minuto
  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  iniciar(@Body() dto: LoginDto) {
    return this.sessions.iniciar(dto);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  cerrar(@Req() peticion: PeticionDeAdministrador) {
    return this.sessions.cerrar(peticion.token);
  }
}
