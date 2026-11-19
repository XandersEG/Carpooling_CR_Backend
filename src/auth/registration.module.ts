import { Module } from '@nestjs/common';
import { MailService } from '../admin/mail.service.js';
import { RegistrationController } from './registration.controller.js';
import { RegistrationService } from './registration.service.js';
import { RegistrationRepository } from './registration.repository.js';
import { PasswordService } from './password.service.js';

// registro de usuarios de la app y verificación del correo institucional
@Module({
  controllers: [RegistrationController],
  providers: [
    RegistrationService,
    RegistrationRepository,
    PasswordService,
    // envía el enlace de verificación
    MailService,
  ],
})
export class RegistrationModule {}
