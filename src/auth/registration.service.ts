import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { huellaDe } from '../admin/admin.guard.js';
import { MailService } from '../admin/mail.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import { PasswordService } from './password.service.js';
import { RegistrationRepository } from './registration.repository.js';

/** Resultado de abrir el enlace de verificación. */
export type ResultadoVerificacion = 'verificado' | 'invalido';

@Injectable()
export class RegistrationService {
  private readonly registro = new Logger(RegistrationService.name);

  constructor(
    @Inject(RegistrationRepository)
    private readonly repository: RegistrationRepository,

    @Inject(PasswordService)
    private readonly passwords: PasswordService,

    @Inject(MailService)
    private readonly correo: MailService,
  ) {}

  /**
   * Crea la cuenta y envía el enlace de verificación al correo institucional.
   * `urlPublica` es la dirección del API (por ejemplo `https://api.midominio.com`)
   * con la que se arma el enlace.
   */
  async register(input: RegisterDto, urlPublica = '') {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    if (input.birthDate > today || input.birthDate < '0001-01-01') {
      throw new BadRequestException('La fecha de nacimiento no es válida.');
    }

    const email = input.email.trim().toLowerCase();
    const domain = email.split('@')[1];

    const institution = await this.repository.findInstitution(domain);

    if (!institution) {
      throw new BadRequestException(
        'El correo debe pertenecer a una institución activa.',
      );
    }

    const gender = await this.repository.findGender(input.gender);

    if (!gender) {
      throw new BadRequestException(
        'Selecciona una opción de género activa y válida.',
      );
    }

    // El móvil envía un único campo fullName: la primera palabra es el nombre.
    const [nombre, ...remainingNames] = input.fullName.trim().split(/\s+/);

    const apellidos = remainingNames.join(' ');

    if (nombre.length > 100 || apellidos.length > 150) {
      throw new BadRequestException(
        'El nombre o los apellidos exceden el tamaño permitido.',
      );
    }

    const passwordHash = await this.passwords.hash(input.password);

    // el token viaja solo en el correo; en la base queda su huella (null = correo verificado)
    const token = randomBytes(32).toString('base64url');

    const user = await this.repository.create({
      institucionId: institution.id,
      generoId: gender.id,
      correoInstitucional: email,
      passwordHash,
      nombre,
      apellidos,
      fechaNacimiento: input.birthDate,
      esConductor: input.roles.includes('conductor'),
      aceptoTerminos: input.acceptedTerms === true,
      fechaAceptacionTerminos: input.acceptedTerms === true ? new Date() : null,
      tokenVerificacion: huellaDe(token),
    });

    if (!user) {
      throw new ConflictException('Ya existe una cuenta con ese correo.');
    }

    await this.enviarVerificacion(email, nombre, token, urlPublica);

    return {
      message:
        'Cuenta creada. Revisa tu correo institucional para verificar la cuenta.',
      user,
      emailVerified: false,
    };
  }

  /** Marca el correo como verificado si el token del enlace es válido. */
  async verificar(token: string | undefined): Promise<ResultadoVerificacion> {
    if (!token || token.length > 200) return 'invalido';
    const usuario = await this.repository.verifyEmail(huellaDe(token));
    return usuario ? 'verificado' : 'invalido';
  }

  /**
   * Envía un enlace nuevo a una cuenta que todavía no verificó su correo.
   * No revela si el correo existe: la respuesta es la misma en todos los casos.
   */
  async reenviar(correo: string, urlPublica = ''): Promise<void> {
    const usuario = await this.repository.findPendingByEmail(correo);
    if (!usuario) return;

    const token = randomBytes(32).toString('base64url');
    await this.repository.setVerificationToken(usuario.id, huellaDe(token));
    await this.enviarVerificacion(
      usuario.correoInstitucional,
      usuario.nombre,
      token,
      urlPublica,
    );
  }

  private async enviarVerificacion(
    para: string,
    nombre: string,
    token: string,
    urlPublica: string,
  ) {
    const enlace = `${urlPublica}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    try {
      await this.correo.enviar({
        para,
        asunto: 'Verifica tu cuenta de Tuanis Carpooling',
        texto:
          `Hola, ${nombre}.\n\n` +
          'Gracias por registrarte en Tuanis Carpooling. Para activar tu cuenta abre este enlace:\n\n' +
          `${enlace}\n\n` +
          'Si no creaste esta cuenta, ignora este mensaje.',
      });
    } catch (error) {
      // la cuenta ya existe: el usuario puede pedir otro enlace desde la app
      this.registro.error(`no se pudo enviar la verificación a ${para}`, error);
    }
  }
}
