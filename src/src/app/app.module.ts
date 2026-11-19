import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PerfilModule } from '../perfil/perfil.module.js';
import { VehiculosModule } from '../vehiculos/vehiculos.module.js';

@Module({
  imports: [PerfilModule, VehiculosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
