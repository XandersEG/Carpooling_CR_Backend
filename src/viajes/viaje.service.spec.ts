
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ViajeService } from './viaje.service.js';
import { ViajeRepo } from './viaje.repo.js';

// jest.mock('./viaje.repo.js', () => ({
//   ViajeRepo: class ViajeRepoMock {},
// }));

describe('ViajeService', () => {
  let service: ViajeService;
  let repo: ViajeRepo;

  const dto = {
    vehiculoId: 1,
    metodoPagoId: 1,
    origenNombre: 'Cartago',
    origenLat: 9.8644,
    origenLng: -83.9194,
    destinoNombre: 'San José',
    destinoLat: 9.9281,
    destinoLng: -84.0907,
    fechaHoraSalida: new Date(Date.now() + 86400000),
    cuposTotales: 3,
    costo: 1500,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViajeService,
        {
          provide: ViajeRepo,
          useValue: {
            buscarConductor: jest.fn(),
            crear: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ViajeService>(ViajeService);
    repo = module.get<ViajeRepo>(ViajeRepo);
  });

  it('debe crear un viaje correctamente', async () => {
    jest.spyOn(repo, 'buscarConductor').mockResolvedValue({
      id: 1,
      esConductor: true,
      activo: true,
    });

    jest.spyOn(repo, 'crear').mockResolvedValue({
      id: 1,
      ...dto,
    } as any);

    const resultado = await service.crear(1, dto);

    expect(resultado.id).toBe(1);
    expect(repo.crear).toHaveBeenCalled();
  });

  it('debe rechazar un usuario inexistente', async () => {
    jest.spyOn(repo, 'buscarConductor').mockResolvedValue(null);

    await expect(service.crear(1, dto)).rejects.toThrow(NotFoundException);
  });

  it('debe rechazar un usuario que no es conductor', async () => {
    jest.spyOn(repo, 'buscarConductor').mockResolvedValue({
      id: 1,
      esConductor: false,
      activo: true,
    });

    await expect(service.crear(1, dto)).rejects.toThrow(ForbiddenException);
  });

  it('debe rechazar un origen igual al destino', async () => {
    jest.spyOn(repo, 'buscarConductor').mockResolvedValue({
      id: 1,
      esConductor: true,
      activo: true,
    });

    const viajeInvalido = {
      ...dto,
      destinoNombre: dto.origenNombre,
    };

    await expect(service.crear(1, viajeInvalido)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debe rechazar una fecha pasada', async () => {
    jest.spyOn(repo, 'buscarConductor').mockResolvedValue({
      id: 1,
      esConductor: true,
      activo: true,
    });

    const viajeInvalido = {
      ...dto,
      fechaHoraSalida: new Date(Date.now() - 86400000),
    };

    await expect(service.crear(1, viajeInvalido)).rejects.toThrow(
      BadRequestException,
    );
  });
});
