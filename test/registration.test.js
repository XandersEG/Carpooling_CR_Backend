import 'reflect-metadata';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { ThrottlerModule } from '@nestjs/throttler';

import { RegistrationController } from '../dist/auth/registration.controller.js';
import { RegistrationService } from '../dist/auth/registration.service.js';
import { RegistrationRepository } from '../dist/auth/registration.repository.js';
import { PasswordService } from '../dist/auth/password.service.js';
import { MailService } from '../dist/admin/mail.service.js';

// Impide abrir conexiones reales durante estas pruebas.
vi.mock('../dist/database/queries.js', () => ({
  db: {},
}));

const valid = {
  fullName: 'Paulo Herrera',
  email: 'paulo@estudiantec.cr',
  gender: 'Masculino',
  roles: ['pasajero'],
  birthDate: '2004-05-20',
  password: 'ClaveDePrueba2026!',
  acceptedTerms: true,
};

const repository = {
  findInstitution: vi.fn(),
  findGender: vi.fn(),
  create: vi.fn(),
};

const passwords = {
  hash: vi.fn(),
};

const mail = {
  enviar: vi.fn(),
};

let app;

beforeAll(async () => {
  class TestModule {}

  Module({
    imports: [
      ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 1000 }] }),
    ],
    controllers: [RegistrationController],
    providers: [
      RegistrationService,
      {
        provide: RegistrationRepository,
        useValue: repository,
      },
      {
        provide: PasswordService,
        useValue: passwords,
      },
      {
        provide: MailService,
        useValue: mail,
      },
    ],
  })(TestModule);

  app = await NestFactory.create(TestModule, {
    logger: false,
  });

  app.setGlobalPrefix('api');
  await app.init();
});

afterAll(async () => {
  await app?.close();
});

beforeEach(() => {
  vi.resetAllMocks();

  repository.findInstitution.mockResolvedValue({
    id: 3,
  });

  repository.findGender.mockResolvedValue({
    id: 2,
  });

  repository.create.mockImplementation(async (data) => ({
    id: 10,
    email: data.correoInstitucional,
  }));

  passwords.hash.mockResolvedValue('hashed-password');
  mail.enviar.mockResolvedValue(undefined);
});

const post = (body) =>
  request(app.getHttpServer())
    .post('/api/auth/register')
    .send(body);

describe('Registro móvil: endpoint HTTP', () => {
  it('crea la cuenta, normaliza datos y no expone secretos', async () => {
    const response = await post({
      ...valid,
      email: '  PAULO@ESTUDIANTEC.CR  ',
      fullName: ' Paulo   Herrera ',
    });

    expect(response.status).toBe(201);

    expect(response.body).toEqual({
      message:
        'Cuenta creada. Revisa tu correo institucional para verificar la cuenta.',
      user: {
        id: 10,
        email: valid.email,
      },
      emailVerified: false,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Paulo',
        apellidos: 'Herrera',
        correoInstitucional: valid.email,
        passwordHash: 'hashed-password',
        institucionId: 3,
        generoId: 2,
        esConductor: false,
        aceptoTerminos: true,
        fechaAceptacionTerminos: expect.any(Date),
        tokenVerificacion:
          expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );

    // el enlace de verificación llega al correo institucional
    expect(mail.enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        para: valid.email,
        texto: expect.stringContaining('/api/auth/verify-email?token='),
      }),
    );
  });

  it.each([
    ['correo inválido', { email: 'no-correo' }],
    ['correo como objeto', { email: {} }],
    ['nombre vacío', { fullName: '  ' }],
    ['nombre muy largo', { fullName: 'a'.repeat(101) }],
    [
      'apellidos muy largos',
      { fullName: 'Ana ' + 'b'.repeat(151) },
    ],
    ['rol administrador', { roles: ['admin'] }],
    ['roles vacíos', { roles: [] }],
    [
      'roles duplicados',
      { roles: ['pasajero', 'pasajero'] },
    ],
    ['roles como texto', { roles: 'pasajero' }],
    ['fecha imposible', { birthDate: '2004-02-30' }],
    ['fecha futura', { birthDate: '2999-01-01' }],
    [
      'fecha con hora',
      { birthDate: '2004-05-20T00:00:00Z' },
    ],
    ['contraseña corta', { password: '123' }],
    [
      'contraseña excesiva',
      { password: 'a'.repeat(129) },
    ],
    ['términos rechazados', { acceptedTerms: false }],
    ['términos omitidos', { acceptedTerms: undefined }],
    ['términos como texto', { acceptedTerms: 'true' }],
    ['campo activo', { activo: true }],
    ['hash enviado por cliente', { passwordHash: 'x' }],
  ])('rechaza %s', async (_label, changes) => {
    const response = await post({
      ...valid,
      ...changes,
    });

    expect(response.status).toBe(400);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rechaza un dominio sin institución activa', async () => {
    repository.findInstitution.mockResolvedValue(undefined);

    const response = await post(valid);

    expect(response.status).toBe(400);
    expect(passwords.hash).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rechaza una opción de género no disponible', async () => {
    repository.findGender.mockResolvedValue(undefined);

    const response = await post(valid);

    expect(response.status).toBe(400);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('devuelve 409 cuando el correo está duplicado', async () => {
    repository.create.mockResolvedValue(undefined);

    const response = await post(valid);

    expect(response.status).toBe(409);
  });

  it.each([
    { roles: ['conductor'] },
    { roles: ['conductor', 'pasajero'] },
  ])('registra capacidad de conducir: $roles', async ({ roles }) => {
    const response = await post({
      ...valid,
      roles,
    });

    expect(response.status).toBe(201);
    expect(
      repository.create.mock.calls[0][0].esConductor,
    ).toBe(true);
  });

  it('no expone detalles de errores de base de datos', async () => {
    repository.create.mockRejectedValue(
      new Error('postgres://secret-password'),
    );

    const response = await post(valid);

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body))
      .not.toContain('secret-password');
  });
});

describe('PasswordService', () => {
  it('genera hashes distintos que el inicio de sesión puede verificar', async () => {
    const service = new PasswordService();

    const first = await service.hash(valid.password);
    const second = await service.hash(valid.password);

    expect(first).not.toBe(second);
    expect(first.length).toBeLessThanOrEqual(255);
    // mismo formato que PasswordHasher, que usa AuthService al iniciar sesión
    expect(first).toMatch(/^\$scrypt\$ln=\d+,r=\d+,p=\d+\$/);

    expect(await service.verify(valid.password, first)).toBe(true);
    expect(await service.verify('otra-clave-123', first)).toBe(false);
  });
});
