import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/password-reset.dto.js';
import { PasswordResetService } from './password-reset.service.js';
import { validacion } from './validacion.js';

// rutas para recuperar la contraseña del portal. no piden sesión; a cambio, limitan los intentos por minuto
@Controller('admin/auth/password-reset')
@UsePipes(validacion)
@UseGuards(ThrottlerGuard)
export class PasswordResetController {
  constructor(private readonly restablecimiento: PasswordResetService) {}

  // pide el correo con el enlace. responde igual exista o no la cuenta
  @Post()
  @HttpCode(204)
  // menos intentos que el resto: cada uno puede enviar un correo
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  solicitar(@Body() dto: RequestPasswordResetDto) {
    return this.restablecimiento.solicitar(dto);
  }

  // cambia la contraseña con el token del enlace
  @Post('confirm')
  @HttpCode(204)
  restablecer(@Body() dto: ResetPasswordDto) {
    return this.restablecimiento.restablecer(dto);
  }
}
