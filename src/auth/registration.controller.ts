import {
  Body,
  Controller,
  Inject,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto.js';
import { RegistrationService } from './registration.service.js';

@Controller('auth')
export class RegistrationController {
  constructor(
    @Inject(RegistrationService)
    private readonly service: RegistrationService,
  ) {}

  @Post('register')
  register(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    input: RegisterDto,
  ) {
    return this.service.register(input);
  }
}