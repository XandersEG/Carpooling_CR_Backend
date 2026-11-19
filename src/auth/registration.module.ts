import { Module } from '@nestjs/common';

import { RegistrationController } from './registration.controller.js';
import { RegistrationRepository } from './registration.repository.js';
import { RegistrationService } from './registration.service.js';

@Module({
  controllers: [RegistrationController],
  providers: [
    RegistrationService,
    RegistrationRepository,
  ],
})
export class RegistrationModule {}