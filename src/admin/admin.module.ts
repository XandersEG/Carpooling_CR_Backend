import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdministratorsController } from './administrators.controller.js';
import { AdministratorsService } from './administrators.service.js';
import { CatalogsController } from './catalogs.controller.js';
import { CatalogsService } from './catalogs.service.js';
import { InstitutionsController } from './institutions.controller.js';
import { InstitutionsService } from './institutions.service.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

// módulo del portal administrativo: sesión, parámetros, instituciones, usuarios y administradores. autor: kaleb lizano, 2026-11-13
@Module({
  imports: [
    // hasta 10 intentos de inicio de sesión por minuto desde una misma dirección
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 10 }],
      errorMessage:
        'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    }),
  ],
  controllers: [
    SessionsController,
    CatalogsController,
    InstitutionsController,
    UsersController,
    AdministratorsController,
  ],
  providers: [
    SessionsService,
    CatalogsService,
    InstitutionsService,
    UsersService,
    AdministratorsService,
  ],
})
export class AdminModule {}
