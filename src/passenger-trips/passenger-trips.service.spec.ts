import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

// unit tests for the passenger trip search (GET /passenger/trips).
// The service calls the database functions directly, so the modules are replaced
// with fakes before the service is imported (ESM mocks must come first).
const buscarViajesDisponibles = jest.fn<(filtros: Record<string, unknown>) => Promise<unknown[]>>();

jest.unstable_mockModule('../database/queries.js', () => ({
  ESTADO_SOLICITUD: { PENDIENTE: 'PENDIENTE', ACEPTADA: 'ACEPTADA', RECHAZADA: 'RECHAZADA' },
  ESTADO_VIAJE: {
    PROGRAMADO: 'PROGRAMADO',
    EN_CURSO: 'EN_CURSO',
    FINALIZADO: 'FINALIZADO',
    CANCELADO: 'CANCELADO',
  },
  buscarViajesDisponibles,
  cancelarSolicitud: jest.fn(),
  obtenerDetalleViaje: jest.fn(),
  obtenerProximosViajesDePasajero: jest.fn(),
  obtenerSolicitudesDePasajero: jest.fn(),
  solicitarViaje: jest.fn(),
}));
jest.unstable_mockModule('./passenger-trips.queries.js', () => ({
  buscarSolicitudDePasajero: jest.fn(),
}));

const { PassengerTripsService } = await import('./passenger-trips.service.js');

describe('PassengerTripsService.disponibles', () => {
  const PASAJERO_ID = 7;
  let service: InstanceType<typeof PassengerTripsService>;

  // a row as the database returns it: decimals come back as text
  const fila = {
    id: 1,
    origen: 'TEC Cartago',
    destino: 'San José centro',
    origenLat: '9.855000',
    origenLng: '-83.912500',
    destinoLat: '9.932500',
    destinoLng: '-84.079500',
    salida: new Date('2026-12-01T12:30:00Z'),
    cuposDisponibles: 3,
    costo: '1500.00',
    metodoPago: 'Efectivo',
    conductor: 'Ana Rojas',
    conductorFoto: null,
    vehiculo: 'Toyota Corolla',
    color: 'Gris',
  };

  // filters received by the database function in the last call
  const filtrosEnviados = () => buscarViajesDisponibles.mock.calls.at(-1)?.[0] ?? {};

  beforeEach(() => {
    buscarViajesDisponibles.mockReset();
    buscarViajesDisponibles.mockResolvedValue([fila]);
    service = new PassengerTripsService();
  });

  it('convierte el costo y las coordenadas a números', async () => {
    const [viaje] = await service.disponibles(PASAJERO_ID, {});

    expect(viaje.costo).toBe(1500);
    expect(viaje.origenLat).toBe(9.855);
    expect(viaje.destinoLng).toBe(-84.0795);
  });

  it('nunca muestra los viajes del propio pasajero', async () => {
    await service.disponibles(PASAJERO_ID, {});

    expect(filtrosEnviados()).toMatchObject({ excluirConductorId: PASAJERO_ID });
  });

  it('envía el origen, el destino y el radio', async () => {
    await service.disponibles(PASAJERO_ID, {
      origenLat: 9.85,
      origenLng: -83.91,
      destinoLat: 9.93,
      destinoLng: -84.08,
      radioGrados: 0.02,
    });

    expect(filtrosEnviados()).toMatchObject({
      origenLat: 9.85,
      origenLng: -83.91,
      destinoLat: 9.93,
      destinoLng: -84.08,
      radioGrados: 0.02,
    });
  });

  it('usa la ventana de horario indicada si es futura', async () => {
    const desde = new Date(Date.now() + 3_600_000);
    const hasta = new Date(Date.now() + 7_200_000);

    await service.disponibles(PASAJERO_ID, { desde, hasta });

    expect(filtrosEnviados()).toMatchObject({ desde, hasta });
  });

  it('no busca viajes pasados aunque la fecha inicial sea anterior', async () => {
    const antes = Date.now();

    await service.disponibles(PASAJERO_ID, { desde: new Date('2020-01-01T00:00:00Z') });

    const { desde } = filtrosEnviados() as { desde: Date };
    expect(desde.getTime()).toBeGreaterThanOrEqual(antes);
  });

  it('sin fecha inicial busca desde ahora', async () => {
    const antes = Date.now();

    await service.disponibles(PASAJERO_ID, {});

    const { desde } = filtrosEnviados() as { desde: Date };
    expect(desde.getTime()).toBeGreaterThanOrEqual(antes);
  });

  it('rechaza solo una coordenada del origen', async () => {
    await expect(service.disponibles(PASAJERO_ID, { origenLat: 9.85 })).rejects.toThrow(
      BadRequestException,
    );
    expect(buscarViajesDisponibles).not.toHaveBeenCalled();
  });

  it('rechaza solo una coordenada del destino', async () => {
    await expect(service.disponibles(PASAJERO_ID, { destinoLng: -84.08 })).rejects.toThrow(
      BadRequestException,
    );
    expect(buscarViajesDisponibles).not.toHaveBeenCalled();
  });

  it('rechaza una fecha inicial posterior a la final', async () => {
    await expect(
      service.disponibles(PASAJERO_ID, {
        desde: new Date('2026-12-02T00:00:00Z'),
        hasta: new Date('2026-12-01T00:00:00Z'),
      }),
    ).rejects.toThrow(BadRequestException);
    expect(buscarViajesDisponibles).not.toHaveBeenCalled();
  });
});
