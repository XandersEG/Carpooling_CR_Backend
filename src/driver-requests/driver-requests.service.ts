import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ESTADO_SOLICITUD, responderSolicitud } from '../database/queries.js';
import { buscarSolicitudesDeConductor } from './driver-requests.queries.js';

type Fila = Awaited<ReturnType<typeof buscarSolicitudesDeConductor>>[number];

const ERRORES_CONOCIDOS: Record<string, (mensaje: string) => HttpException> = {
  'La solicitud no existe': (m) => new NotFoundException(`${m}.`),
  'Solo el conductor del viaje puede responder la solicitud': () =>
    new ForbiddenException('Esta solicitud es de un viaje de otro conductor.'),
  'La solicitud ya fue respondida': (m) => new ConflictException(`${m}.`),
  'El viaje ya no está programado': (m) => new ConflictException(`${m}.`),
  'El viaje ya no tiene cupos disponibles': (m) =>
    new ConflictException(`${m}.`),
};

@Injectable()
export class DriverRequestsService {
  async listar(conductorId: number) {
    const filas = await buscarSolicitudesDeConductor(conductorId);
    return filas.map((fila) => this.respuesta(fila));
  }

  async responder(solicitudId: number, conductorId: number, aceptar: boolean) {
    if (solicitudId < 1) {
      throw new NotFoundException('La solicitud no existe.');
    }
    try {
      await responderSolicitud(solicitudId, conductorId, aceptar);
    } catch (error) {
      const crear =
        error instanceof Error ? ERRORES_CONOCIDOS[error.message] : undefined;
      if (crear && error instanceof Error) throw crear(error.message);
      throw error;
    }
    return {
      id: solicitudId,
      estado: aceptar ? ESTADO_SOLICITUD.ACEPTADA : ESTADO_SOLICITUD.RECHAZADA,
    };
  }

  private respuesta(fila: Fila) {
    return {
      id: fila.id,
      estado:
        fila.fechaRespuesta === null
          ? ESTADO_SOLICITUD.PENDIENTE
          : ESTADO_SOLICITUD.ACEPTADA,
      pasajero: {
        id: fila.pasajeroId,
        nombre: `${fila.nombre} ${fila.apellidos}`,
        fotoUrl: fila.fotoUrl,
      },
      puntoRecogida: {
        nombre: fila.puntoRecogida,
        lat: Number(fila.puntoRecogidaLat),
        lng: Number(fila.puntoRecogidaLng),
      },
      viaje: {
        id: fila.viajeId,
        origen: { nombre: fila.origen },
        destino: { nombre: fila.destino },
        salida: fila.salida,
        costo: Number(fila.costo),
      },
    };
  }
}
