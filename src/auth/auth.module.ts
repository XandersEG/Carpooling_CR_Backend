import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

// módulo de sesión de los usuarios de la app móvil: iniciar, cerrar y consultar la sesión. autor: Juan Carlos Monsalve, 2026-11-16
// el límite de intentos del login usa el ThrottlerModule que registra AdminModule, que es global
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
