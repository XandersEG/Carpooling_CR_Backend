import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { VehiclesService } from './vehicles.service.js';
import { VehiculoRepo, type Vehiculo } from './vehiculo.repo.js';

// unit tests for the driver's vehicle rules (/driver/vehicles); the repo is mocked
describe('VehiclesService', () => {
  const USUARIO_ID = 1;

  const vehiculo: Vehiculo = {
    id: 10,
    usuarioId: USUARIO_ID,
    placa: 'ABC123',
    marca: 'Toyota',
    modelo: 'Corolla',
    color: 'Gris',
    capacidadPasajeros: 4,
    activo: true,
    creadoEn: new Date('2026-11-01T00:00:00Z'),
  };

  const nuevo = {
    placa: 'XYZ789',
    marca: 'Hyundai',
    modelo: 'Tucson',
    color: 'Azul',
    capacidadPasajeros: 4,
  };

  // the database driver reports constraint errors with a Postgres code
  const errorPostgres = (code: string) =>
    Object.assign(new Error('db error'), { cause: { code } });

  let repo: {
    listar: jest.Mock<VehiculoRepo['listar']>;
    buscarPorId: jest.Mock<VehiculoRepo['buscarPorId']>;
    buscarPorPlaca: jest.Mock<VehiculoRepo['buscarPorPlaca']>;
    crear: jest.Mock<VehiculoRepo['crear']>;
    actualizar: jest.Mock<VehiculoRepo['actualizar']>;
    eliminar: jest.Mock<VehiculoRepo['eliminar']>;
    activar: jest.Mock<VehiculoRepo['activar']>;
  };
  let service: VehiclesService;

  beforeEach(() => {
    repo = {
      listar: jest.fn<VehiculoRepo['listar']>(),
      buscarPorId: jest.fn<VehiculoRepo['buscarPorId']>(),
      buscarPorPlaca: jest.fn<VehiculoRepo['buscarPorPlaca']>(),
      crear: jest.fn<VehiculoRepo['crear']>(),
      actualizar: jest.fn<VehiculoRepo['actualizar']>(),
      eliminar: jest.fn<VehiculoRepo['eliminar']>(),
      activar: jest.fn<VehiculoRepo['activar']>(),
    };
    service = new VehiclesService(repo as unknown as VehiculoRepo);
  });

  describe('buscarPorId', () => {
    it('devuelve el vehículo del conductor', async () => {
      repo.buscarPorId.mockResolvedValue(vehiculo);

      await expect(service.buscarPorId(10, USUARIO_ID)).resolves.toBe(vehiculo);
      expect(repo.buscarPorId).toHaveBeenCalledWith(10, USUARIO_ID);
    });

    it('rechaza un vehículo inexistente o ajeno', async () => {
      repo.buscarPorId.mockResolvedValue(null);

      await expect(service.buscarPorId(10, USUARIO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('crear', () => {
    it('registra el vehículo cuando la placa está libre', async () => {
      repo.buscarPorPlaca.mockResolvedValue(null);
      repo.crear.mockResolvedValue({ ...vehiculo, ...nuevo, id: 11 });

      const creado = await service.crear(USUARIO_ID, nuevo);

      expect(creado.id).toBe(11);
      expect(repo.crear).toHaveBeenCalledWith(USUARIO_ID, nuevo);
    });

    it('rechaza una placa ya registrada', async () => {
      repo.buscarPorPlaca.mockResolvedValue(vehiculo);

      await expect(service.crear(USUARIO_ID, nuevo)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.crear).not.toHaveBeenCalled();
    });

    it('rechaza una placa duplicada detectada por la base de datos (23505)', async () => {
      repo.buscarPorPlaca.mockResolvedValue(null);
      repo.crear.mockRejectedValue(errorPostgres('23505'));

      await expect(service.crear(USUARIO_ID, nuevo)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('actualizar', () => {
    it('actualiza los datos del vehículo', async () => {
      repo.buscarPorId.mockResolvedValue(vehiculo);
      repo.actualizar.mockResolvedValue({ ...vehiculo, color: 'Rojo' });

      const actualizado = await service.actualizar(10, USUARIO_ID, {
        color: 'Rojo',
      });

      expect(actualizado.color).toBe('Rojo');
    });

    it('rechaza un vehículo inexistente', async () => {
      repo.buscarPorId.mockResolvedValue(null);

      await expect(
        service.actualizar(10, USUARIO_ID, { color: 'Rojo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza una petición sin campos', async () => {
      repo.buscarPorId.mockResolvedValue(vehiculo);

      await expect(service.actualizar(10, USUARIO_ID, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.actualizar).not.toHaveBeenCalled();
    });

    it('rechaza una placa que pertenece a otro vehículo', async () => {
      repo.buscarPorId.mockResolvedValue(vehiculo);
      repo.buscarPorPlaca.mockResolvedValue({ ...vehiculo, id: 20 });

      await expect(
        service.actualizar(10, USUARIO_ID, { placa: 'OTRA01' }),
      ).rejects.toThrow(ConflictException);
      expect(repo.actualizar).not.toHaveBeenCalled();
    });

    it('permite guardar la misma placa del vehículo', async () => {
      repo.buscarPorId.mockResolvedValue(vehiculo);
      repo.actualizar.mockResolvedValue(vehiculo);

      await service.actualizar(10, USUARIO_ID, { placa: 'ABC123' });

      expect(repo.buscarPorPlaca).not.toHaveBeenCalled();
      expect(repo.actualizar).toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('elimina el vehículo del conductor', async () => {
      repo.eliminar.mockResolvedValue(vehiculo);

      await expect(service.eliminar(10, USUARIO_ID)).resolves.toBeUndefined();
    });

    it('rechaza un vehículo inexistente', async () => {
      repo.eliminar.mockResolvedValue(null);

      await expect(service.eliminar(10, USUARIO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza un vehículo con viajes asociados (23503)', async () => {
      repo.eliminar.mockRejectedValue(errorPostgres('23503'));

      await expect(service.eliminar(10, USUARIO_ID)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('activar', () => {
    it('activa el vehículo seleccionado', async () => {
      repo.activar.mockResolvedValue(vehiculo);

      await expect(service.activar(10, USUARIO_ID)).resolves.toBe(vehiculo);
      expect(repo.activar).toHaveBeenCalledWith(10, USUARIO_ID);
    });

    it('rechaza un vehículo inexistente', async () => {
      repo.activar.mockResolvedValue(null);

      await expect(service.activar(10, USUARIO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
