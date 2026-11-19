import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ESTADO_SOLICITUD,
  ESTADO_VIAJE,
  obtenerSolicitudesDePasajero,
  type EstadoSolicitud,
  type EstadoViaje,
} from '../database/queries.js';
import { buscarViajesParaPasajero } from './passenger-requests.queries.js';

type Solicitud = Awaited<
  ReturnType<typeof obtenerSolicitudesDePasajero>
>[number];
type ViajeDelPasajero = Awaited<
  ReturnType<typeof buscarViajesParaPasajero>
>[number];

// cancelarSolicitud borra la fila, así que una solicitud solo se ve cancelada por
// lo que pasó con su viaje. Una rechazada sigue rechazada pase lo que pase.
function estadoParaPasajero(estado: EstadoSolicitud, estadoViaje: EstadoViaje) {
  if (estado === ESTADO_SOLICITUD.RECHAZADA) {
    return estado;
  }
  // una pendiente ya no se puede responder cuando el viaje dejó de estar programado
  const sinRespuestaPosible =
    estado === ESTADO_SOLICITUD.PENDIENTE &&
    estadoViaje !== ESTADO_VIAJE.PROGRAMADO;
  return estadoViaje === ESTADO_VIAJE.CANCELADO || sinRespuestaPosible
    ? 'CANCELADA'
    : estado;
}

// sigue en pie para el pasajero: su solicitud vale y el viaje no ha quedado atrás
function solicitudActiva(solicitud: Solicitud, ahora: number) {
  const estado = estadoParaPasajero(solicitud.estado, solicitud.estadoViaje);
  if (estado === 'CANCELADA' || estado === ESTADO_SOLICITUD.RECHAZADA) {
    return false;
  }
  return (
    solicitud.estadoViaje === ESTADO_VIAJE.EN_CURSO ||
    (solicitud.estadoViaje === ESTADO_VIAJE.PROGRAMADO &&
      solicitud.salida.getTime() > ahora)
  );
}

// primero las activas, la más próxima arriba; después las demás, la más reciente arriba
function ordenDeMisViajes(ahora: number) {
  return (a: Solicitud, b: Solicitud) => {
    const activa = solicitudActiva(a, ahora);
    if (activa !== solicitudActiva(b, ahora)) {
      return activa ? -1 : 1;
    }
    const diferencia = a.salida.getTime() - b.salida.getTime();
    return activa ? diferencia : -diferencia;
  };
}

// solicitudes de viaje desde el lado del pasajero
@Injectable()
export class PassengerRequestsService {
  // solicitudes propias en el orden de "Mis Viajes". autor: Wes, 2026-11-18
  async listar(pasajeroId: number) {
    const solicitudes = (await obtenerSolicitudesDePasajero(pasajeroId)).sort(
      ordenDeMisViajes(Date.now()),
    );
    const viajes = await buscarViajesParaPasajero(
      solicitudes.map((solicitud) => solicitud.viajeId),
    );
    const viajePorId = new Map(viajes.map((fila) => [fila.viaje.id, fila]));
    return solicitudes.flatMap((solicitud) => {
      const fila = viajePorId.get(solicitud.viajeId);
      return fila ? [this.respuesta(solicitud, fila)] : [];
    });
  }

  // resumen de una solicitud propia; la de otra persona no existe para quien pregunta. autor: Wes, 2026-11-18
  async obtener(solicitudId: number, pasajeroId: number) {
    const solicitudes = await obtenerSolicitudesDePasajero(pasajeroId);
    const solicitud = solicitudes.find((item) => item.id === solicitudId);
    if (!solicitud) {
      throw new NotFoundException('La solicitud no existe.');
    }
    const [fila] = await buscarViajesParaPasajero([solicitud.viajeId]);
    if (!fila) {
      throw new NotFoundException('La solicitud no existe.');
    }
    return this.respuesta(solicitud, fila);
  }

  private respuesta(solicitud: Solicitud, fila: ViajeDelPasajero) {
    const { viaje } = fila;
    return {
      id: solicitud.id,
      estado: estadoParaPasajero(solicitud.estado, solicitud.estadoViaje),
      puntoRecogida: { nombre: solicitud.puntoRecogida },
      viaje: {
        id: viaje.id,
        estado: solicitud.estadoViaje,
        origen: { nombre: viaje.origenNombre },
        destino: { nombre: viaje.destinoNombre },
        salida: viaje.fechaHoraSalida,
        cuposDisponibles: viaje.cuposDisponibles,
        costo: Number(viaje.costo),
        metodoPago: { id: viaje.metodoPagoId, nombre: fila.metodoPago },
        conductor: {
          id: viaje.conductorId,
          nombre: `${fila.conductorNombre} ${fila.conductorApellidos}`,
          fotoUrl: fila.conductorFoto,
          genero: fila.genero,
          // solo se muestra verificada una cuenta confirmada de una institución activa
          institucion:
            fila.institucionActiva && !fila.tokenVerificacion
              ? fila.institucion
              : null,
        },
        vehiculo: {
          marca: fila.marca,
          modelo: fila.modelo,
          color: fila.color,
          placa: fila.placa,
          capacidad: fila.capacidad,
        },
      },
    };
  }
}
