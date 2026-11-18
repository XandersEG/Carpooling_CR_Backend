import { Module } from '@nestjs/common';
import { PassengerTripsController } from './passenger-trips.controller.js';
import { PassengerTripsService } from './passenger-trips.service.js';

@Module({
    controllers: [PassengerTripsController], providers: [PassengerTripsService],
})



export class PassengerTripsModule {}