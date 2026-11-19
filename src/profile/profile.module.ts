import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

// perfil del usuario de la app móvil: consultar, editar y lugares frecuentes
@Module({
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
