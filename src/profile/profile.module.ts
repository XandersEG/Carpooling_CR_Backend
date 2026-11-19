import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

// perfil del usuario de la app móvil: ver y editar sus datos. autor: Juan Carlos Monsalve, 2026-11-19
@Module({
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}