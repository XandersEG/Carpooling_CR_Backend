import { PasswordHasher } from '@nestjs/authentication';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';

import type { RegisterDto } from './dto/register.dto.js';
import { RegistrationRepository } from './registration.repository.js';

@Injectable()
export class RegistrationService {
  private readonly hasher = new PasswordHasher();

  constructor(
    @Inject(RegistrationRepository)
    private readonly repository: RegistrationRepository,
  ) {}

  async register(input: RegisterDto) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    if (
      input.birthDate > today ||
      input.birthDate < '0001-01-01'
    ) {
      throw new BadRequestException(
        'La fecha de nacimiento no es válida.',
      );
    }

    const email = input.email.trim().toLowerCase();
    const domain = email.split('@')[1];

    const institution =
      await this.repository.findInstitution(domain);

    if (!institution) {
      throw new BadRequestException(
        'El correo debe pertenecer a una institución activa.',
      );
    }

    const gender =
      await this.repository.findGender(input.gender);

    if (!gender) {
      throw new BadRequestException(
        'Selecciona una opción de género activa y válida.',
      );
    }

    // El móvil envía un único campo fullName.
    const [nombre, ...remainingNames] = input.fullName
      .trim()
      .split(/\s+/);

    const apellidos = remainingNames.join(' ');

    if (nombre.length > 100 || apellidos.length > 150) {
      throw new BadRequestException(
        'El nombre o los apellidos exceden el tamaño permitido.',
      );
    }

    // Se utiliza el mismo PasswordHasher que usa AuthService al hacer login.
    const passwordHash = await this.hasher.hash(input.password);

    const user = await this.repository.create({
      institucionId: institution.id,
      generoId: gender.id,
      correoInstitucional: email,
      passwordHash,
      nombre,
      apellidos,
      fechaNacimiento: input.birthDate,
      esConductor: input.roles.includes('conductor'),
      aceptoTerminos: input.acceptedTerms,
      fechaAceptacionTerminos:
        input.acceptedTerms ? new Date() : null,

      // Prototipo: el usuario queda verificado inmediatamente.
      tokenVerificacion: null,
    });

    if (!user) {
      throw new ConflictException(
        'Ya existe una cuenta con ese correo.',
      );
    }

    return {
      message: 'Cuenta creada.',
      user,
      emailVerified: true,
    };
  }
}