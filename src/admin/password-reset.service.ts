import { randomBytes } from 'node:crypto';
import { PasswordHasher } from '@nestjs/authentication';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  buscarAdministradorPorCorreo,
  guardarTokenRefresco,
  revocarTokensDeAdministrador,
} from '../database/queries.js';
import { huellaDe } from './admin.guard.js';
import {
  actualizarAdministrador,
  buscarSesion,
  codigoDeError,
} from './admin.queries.js';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/password-reset.dto.js';
import { MailService } from './mail.service.js';

// tiempo que sirve el enlace del correo
const VIGENCIA_MINUTOS = 30;

// la huella de un enlace lleva este prefijo: así un enlace nunca sirve como token de sesión, ni una sesión como enlace
function huellaDeEnlace(token: string): string {
  return huellaDe(`restablecer:${token}`);
}

// recuperación de la contraseña de un administrador por correo
@Injectable()
export class PasswordResetService {
  // el mismo hash scrypt con el que se guardan las contraseñas
  private readonly hasher = new PasswordHasher();
  private readonly registro = new Logger(PasswordResetService.name);

  constructor(private readonly correos: MailService) {}

  // si el correo es de un administrador activo, le envía un enlace para cambiar la contraseña
  async solicitar(dto: RequestPasswordResetDto): Promise<void> {
    // la consulta del equipo solo devuelve administradores activos
    const administrador = await buscarAdministradorPorCorreo(dto.correo);
    // la respuesta es la misma exista o no la cuenta, para no revelar cuáles existen
    if (!administrador) {
      return;
    }

    // el token viaja solo en el correo; en la base queda su huella, en la tabla de sesiones
    const token = randomBytes(32).toString('base64url');
    await guardarTokenRefresco({
      administradorId: administrador.id,
      tokenHash: huellaDeEnlace(token),
      expiraEn: new Date(Date.now() + VIGENCIA_MINUTOS * 60 * 1000),
    });

    // dirección del portal web, para armar el enlace
    const portal = (process.env.PORTAL_URL ?? 'http://localhost:8081').replace(
      /\/+$/,
      '',
    );
    // no se espera al envío: así la respuesta tarda lo mismo exista o no la cuenta
    void this.correos
      .enviar({
        para: administrador.correo,
        asunto: 'Restablece tu contraseña de Tuanis Carpooling',
        texto: [
          `Hola, ${administrador.nombre}:`,
          'Recibimos una solicitud para restablecer la contraseña de tu cuenta del portal administrativo de Tuanis Carpooling.',
          `Abre este enlace para elegir una contraseña nueva:\n${portal}/admin/restablecer?token=${token}`,
          `El enlace vence en ${VIGENCIA_MINUTOS} minutos y solo se puede usar una vez.`,
          'Si no pediste este cambio, ignora este correo: tu contraseña sigue siendo la misma.',
        ].join('\n\n'),
      })
      .catch((error: unknown) => {
        // al registro va solo el código del fallo, no el correo ni el enlace
        this.registro.error(
          `no se pudo enviar el correo para restablecer una contraseña (${codigoDeError(error) ?? 'sin código'})`,
        );
      });
  }

  // cambia la contraseña con el token del enlace y cierra las sesiones de esa cuenta
  async restablecer(dto: ResetPasswordDto): Promise<void> {
    // sirve la misma consulta de las sesiones: token sin revocar ni vencer, de un administrador activo
    const enlace = await buscarSesion(huellaDeEnlace(dto.token));
    if (!enlace) {
      throw new BadRequestException(
        'El enlace no es válido o ya venció. Solicita uno nuevo.',
      );
    }

    const passwordHash = await this.hasher.hash(dto.password);
    await actualizarAdministrador(enlace.administradorId, { passwordHash });
    // revoca las sesiones abiertas y también este enlace y los demás que estén pendientes
    await revocarTokensDeAdministrador(enlace.administradorId);
  }
}
