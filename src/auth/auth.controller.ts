// Autor: Juan Carlos Monsalve
// Fecha: 16/11/2026
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { validacion } from '../admin/validacion.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { UserGuard, type PeticionDeUsuario } from './user.guard.js';

// rutas de sesión de los usuarios de la app móvil
@Controller('auth')
@UsePipes(validacion)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // no pide sesión; a cambio, limita los intentos por minuto
  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  iniciar(@Body() dto: LoginDto) {
    return this.auth.iniciar(dto);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(UserGuard)
  cerrar(@Req() peticion: PeticionDeUsuario) {
    return this.auth.cerrar(peticion.token);
  }

  // datos del usuario que tiene la sesión abierta
  @Get('me')
  @UseGuards(UserGuard)
  perfil(@Req() peticion: PeticionDeUsuario) {
    return this.auth.perfil(peticion.usuarioId);
  }
}
