import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import { ProfileService } from './profile.service.js';

// reglas de "Mi Perfil" que se validan antes de tocar la base
describe('ProfileService.actualizar', () => {
  const service = new ProfileService();

  it('rechaza una petición sin cambios', async () => {
    await expect(service.actualizar(1, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una fecha de nacimiento futura', async () => {
    await expect(service.actualizar(1, { fechaNacimiento: '2999-01-01' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza apellidos demasiado largos', async () => {
    await expect(
      service.actualizar(1, { nombreCompleto: `Ana ${'b'.repeat(151)}` }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
