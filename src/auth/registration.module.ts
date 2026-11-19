import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller.js';
import { RegistrationService } from './registration.service.js';
import { RegistrationRepository } from './registration.repository.js';
import { PasswordService } from './password.service.js';

@Module({
  controllers: [RegistrationController],
  providers: [
    RegistrationService,
    RegistrationRepository,
    PasswordService,
  ],
})
export class RegistrationModule {}