import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RegistrationModule } from '../auth/registration.module.js';


@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
