import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { RegistrationService } from './registration.service.js';

const validar = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

/**
 * Dirección pública del API para armar el enlace del correo. Se toma de
 * `PUBLIC_API_URL` (recomendado en producción, p. ej. la URL de Vercel) o, si
 * no existe, de la petición recibida.
 */
export function urlPublica(peticion: Request): string {
  const configurada = process.env.PUBLIC_API_URL?.trim();
  if (configurada) return configurada.replace(/\/+$/, '').replace(/\/api$/, '');
  const protocolo =
    (peticion.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ??
    peticion.protocol;
  return `${protocolo}://${peticion.get('host') ?? 'localhost'}`;
}

function pagina(titulo: string, mensaje: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#faf6f1;color:#3b2a20;display:flex;min-height:100vh;align-items:center;justify-content:center}
main{max-width:420px;margin:16px;padding:32px;background:#fff;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,.08);text-align:center}
h1{font-size:22px;margin:0 0 12px}p{line-height:1.5;margin:0}</style></head>
<body><main><h1>${titulo}</h1><p>${mensaje}</p></main></body></html>`;
}

@Controller('auth')
export class RegistrationController {
  constructor(
    @Inject(RegistrationService)
    private readonly service: RegistrationService,
  ) {}

  // POST /api/auth/register
  @Post('register')
  @UseGuards(ThrottlerGuard)
  register(@Body(validar) input: RegisterDto, @Req() peticion: Request) {
    return this.service.register(input, urlPublica(peticion));
  }

  // GET /api/auth/verify-email?token=...  (enlace que llega por correo)
  @Get('verify-email')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async verifyEmail(@Query('token') token?: string) {
    const resultado = await this.service.verificar(token);
    return resultado === 'verificado'
      ? pagina(
          '¡Correo verificado!',
          'Tu cuenta de Tuanis Carpooling está activa. Vuelve a la app e inicia sesión.',
        )
      : pagina(
          'Enlace no válido',
          'El enlace ya se usó o no es correcto. Si aún no puedes iniciar sesión, pide un enlace nuevo desde la app.',
        );
  }

  // POST /api/auth/resend-verification
  @Post('resend-verification')
  @HttpCode(204)
  @UseGuards(ThrottlerGuard)
  async resend(@Body(validar) dto: ResendVerificationDto, @Req() peticion: Request) {
    await this.service.reenviar(dto.correo, urlPublica(peticion));
  }
}
