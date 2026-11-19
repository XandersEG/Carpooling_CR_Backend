import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import { ConsultasAdminController } from './consultas-admin.controller.js';
import { ConsultasAdminService } from './consultas-admin.service.js';

describe('ConsultasAdminController.usuariosActivos', () => {
  const service = new ConsultasAdminService();
  const consultar = jest.spyOn(service, 'usuariosActivos');
  const controller = new ConsultasAdminController(service);

  beforeEach(() => {
    consultar.mockReset();
    consultar.mockResolvedValue({ usuarios: [], totalUsuarios: 0 });
  });

  it('uses the default top and trims the search term', async () => {
    await controller.usuariosActivos(undefined, 4, ' Ana ');

    expect(consultar).toHaveBeenCalledWith({
      top: 5,
      institucionId: 4,
      buscar: 'Ana',
    });
  });

  it('rejects a top outside the supported range', () => {
    expect(() => controller.usuariosActivos(21)).toThrow(BadRequestException);
    expect(consultar).not.toHaveBeenCalled();
  });

  it('rejects a non-positive institution id', () => {
    expect(() => controller.usuariosActivos(5, 0)).toThrow(BadRequestException);
    expect(consultar).not.toHaveBeenCalled();
  });
});
