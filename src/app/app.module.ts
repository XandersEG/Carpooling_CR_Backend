import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module.js';
import { ConsultasAdminModule } from '../admin/consultas-admin.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StatisticsModule } from '../statistics/statistics.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { StatisticsModule } from '../statistics/statistics.module.js';
import {PassengerTripsModule} from '../passenger-trips/passenger-trips.module.js'
import { TripsModule } from '../trips/trips.module.js';
import { PassengerRequestsModule } from '../passenger-requests/passenger-requests.module.js';
import { DriverRequestsModule } from '../driver-requests/driver-requests.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { PublicCatalogsModule } from '../catalogs/public-catalogs.module.js';
import { ViajeModule } from '../viajes/viaje.module.js';
import { ConcurrentPointsModule } from '../concurrent-points/concurrent-points.module.js';

import { ConfigModule } from '@nestjs/config';
import { RegistrationModule } from '../auth/registration.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
    isGlobal: true,
    }),
    AdminModule,
    RegistrationModule,
    AuthModule,
    StatisticsModule,
    TripsModule,
    PassengerRequestsModule,
    DriverRequestsModule,
    VehiclesModule,
    PublicCatalogsModule,
    ViajeModule,
    PassengerTripsModule,
    ConcurrentPointsModule,
    ConsultasAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}