import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { ViajeService } from './viaje.service.js';
import { ViajeRepo } from './viaje.repo.js';
import { CreateViajeDto } from './dto/create-viaje.dto.js';

// unit tests for the trip publishing rules (POST /driver/trips); the repo is mocked
describe('ViajeService.crear', () => {
  const CONDUCTOR_ID = 1;

  const conductorValido = { id: CONDUCTOR_ID, esConductor: true, activo: true };
  const vehiculoValido = {
    id: 10,
    usuarioId: CONDUCTOR_ID,
    activo: true,
    capacidadPasajeros: 4,
  };
  const metodoValido = { id: 2, activo: true };

  let repo: {
    buscarConductor: jest.Mock<ViajeRepo['buscarConductor']>;
    buscarVehiculo: jest.Mock<ViajeRepo['buscarVehiculo']>;
    buscarMetodoPago: jest.Mock<ViajeRepo['buscarMetodoPago']>;
    crear: jest.Mock<ViajeRepo['crear']>;
  };
  let service: ViajeService;

  // a valid trip; each test changes only what it needs
  const dtoValido = (cambios: Partial<CreateViajeDto> = {}): CreateViajeDto => ({
    vehiculoId: 10,
    metodoPagoId: 2,
    origenNombre: 'Cartago',
    origenLat: 9.8644,
    origenLng: -83.9194,
    destinoNombre: 'San José',
    destinoLat: 9.9281,
    destinoLng: -84.0907,
    fechaHoraSalida: new Date(Date.now() + 86_400_000),
    cuposTotales: 3,
    costo: 1500,
    ...cambios,
  });

  beforeEach(() => {
    repo = {
      buscarConductor: jest.fn<ViajeRepo['buscarConductor']>(),
      buscarVehiculo: jest.fn<ViajeRepo['buscarVehiculo']>(),
      buscarMetodoPago: jest.fn<ViajeRepo['buscarMetodoPago']>(),
      crear: jest.fn<ViajeRepo['crear']>(),
    };
    // by default every lookup succeeds
    repo.buscarConductor.mockResolvedValue(conductorValido);
    repo.buscarVehiculo.mockResolvedValue(vehiculoValido);
    repo.buscarMetodoPago.mockResolvedValue(metodoValido);
    repo.crear.mockResolvedValue({ id: 99 } as Awaited<
      ReturnType<ViajeRepo['crear']>
    >);

    service = new ViajeService(repo as unknown as ViajeRepo);
  });

  // checks that the request is rejected with the given error and nothing is saved
  async function esperarRechazo(dto: CreateViajeDto, error: new (...args: never[]) => Error) {
    await expect(service.crear(CONDUCTOR_ID, dto)).rejects.toThrow(error);
    expect(repo.crear).not.toHaveBeenCalled();
  }

  it('crea el viaje con los datos convertidos para la base de datos', async () => {
    const dto = dtoValido();

    const viaje = await service.crear(CONDUCTOR_ID, dto);

    expect(viaje.id).toBe(99);
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        conductorId: CONDUCTOR_ID,
        vehiculoId: 10,
        metodoPagoId: 2,
        origenLat: '9.8644',
        destinoLng: '-84.0907',
        cuposTotales: 3,
        costo: '1500.00',
      }),
    );
  });

  it('acepta un viaje gratuito (costo 0)', async () => {
    await service.crear(CONDUCTOR_ID, dtoValido({ costo: 0 }));

    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({ costo: '0.00' }),
    );
  });

  it('acepta cupos iguales a la capacidad del vehículo', async () => {
    await service.crear(CONDUCTOR_ID, dtoValido({ cuposTotales: 4 }));

    expect(repo.crear).toHaveBeenCalled();
  });

  it('rechaza un usuario inexistente', async () => {
    repo.buscarConductor.mockResolvedValue(null);
    await esperarRechazo(dtoValido(), NotFoundException);
  });

  it('rechaza un usuario inactivo', async () => {
    repo.buscarConductor.mockResolvedValue({ ...conductorValido, activo: false });
    await esperarRechazo(dtoValido(), NotFoundException);
  });

  it('rechaza un usuario que no es conductor', async () => {
    repo.buscarConductor.mockResolvedValue({ ...conductorValido, esConductor: false });
    await esperarRechazo(dtoValido(), ForbiddenException);
  });

  it('rechaza origen y destino con el mismo nombre (sin importar mayúsculas)', async () => {
    await esperarRechazo(
      dtoValido({ destinoNombre: 'CARTAGO' }),
      BadRequestException,
    );
  });

  it('rechaza origen y destino con las mismas coordenadas', async () => {
    await esperarRechazo(
      dtoValido({ destinoLat: 9.8644, destinoLng: -83.9194 }),
      BadRequestException,
    );
  });

  it('rechaza una fecha de salida pasada', async () => {
    await esperarRechazo(
      dtoValido({ fechaHoraSalida: new Date(Date.now() - 86_400_000) }),
      BadRequestException,
    );
  });

  it('rechaza un vehículo inexistente', async () => {
    repo.buscarVehiculo.mockResolvedValue(null);
    await esperarRechazo(dtoValido(), NotFoundException);
  });

  it('rechaza un vehículo de otro conductor', async () => {
    repo.buscarVehiculo.mockResolvedValue({ ...vehiculoValido, usuarioId: 2 });
    await esperarRechazo(dtoValido(), NotFoundException);
  });

  it('rechaza un vehículo que no está activo', async () => {
    repo.buscarVehiculo.mockResolvedValue({ ...vehiculoValido, activo: false });
    await esperarRechazo(dtoValido(), BadRequestException);
  });

  it('rechaza más cupos que la capacidad del vehículo', async () => {
    await esperarRechazo(dtoValido({ cuposTotales: 5 }), BadRequestException);
  });

  it('rechaza un método de pago inexistente', async () => {
    repo.buscarMetodoPago.mockResolvedValue(null);
    await esperarRechazo(dtoValido(), BadRequestException);
  });

  it('rechaza un método de pago inactivo', async () => {
    repo.buscarMetodoPago.mockResolvedValue({ ...metodoValido, activo: false });
    await esperarRechazo(dtoValido(), BadRequestException);
  });
});
