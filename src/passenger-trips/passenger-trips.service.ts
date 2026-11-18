import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ESTADO_SOLICITUD,
  ESTADO_VIAJE,
  buscarViajesDisponibles,
  cancelarSolicitud,
  obtenerDetalleViaje,
  obtenerProximosViajesDePasajero,
  obtenerSolicitudesDePasajero,
  solicitarViaje,
  type EstadoSolicitud,
} from '../database/queries.js';
import { CreateJoinRequestDto } from './dto/create-join-request.dto.js';
import { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import { buscarSolicitudDePasajero } from './passenger-trips.queries.js';

type Detalle = NonNullable<Awaited<ReturnType<typeof obtenerDetalleViaje>>>;
type Solicitud = NonNullable<Awaited<ReturnType<typeof buscarSolicitudDePasajero>>>;

// la columna id es integer: un número mayor no puede ser de ningún viaje
const ID_MAXIMO = 2_147_483_647;

// misma regla que estadoSolicitudSql en queries.ts
function estadoDe(solicitud: Solicitud): EstadoSolicitud {
  if (solicitud.fechaRespuesta === null) return ESTADO_SOLICITUD.PENDIENTE;
  return solicitud.respuesta
    ? ESTADO_SOLICITUD.ACEPTADA
    : ESTADO_SOLICITUD.RECHAZADA;
}

// reglas del viaje desde el lado del pasajero
@Injectable()
export class PassengerTripsService {
  // viajes programados con cupo; nunca los propios
  async disponibles(pasajeroId: number, filtros: ListTripsQueryDto) {
    if ((filtros.origenLat === undefined) !== (filtros.origenLng === undefined)) {
      throw new BadRequestException(
        'Indica la latitud y la longitud del origen juntas.',
      );
    }
    const viajes = await buscarViajesDisponibles({
      origenLat: filtros.origenLat,
      origenLng: filtros.origenLng,
      radioGrados: filtros.radioGrados,
      destinoNombre: filtros.destinoNombre,
      excluirConductorId: pasajeroId,
    });
    return viajes.map((viaje) => ({ ...viaje, costo: Number(viaje.costo) }));
  }

  // detalle con la ruta y, si ya pidió unirse, la solicitud del pasajero
  async obtener(viajeId: number, pasajeroId: number) {
    const detalle = await this.viaje(viajeId);
    const solicitud = await buscarSolicitudDePasajero(viajeId, pasajeroId);
    return this.respuesta(detalle, solicitud);
  }

  // pedir cupo eligiendo dónde lo recogen
  async solicitarUnirse(
    viajeId: number,
    pasajeroId: number,
    dto: CreateJoinRequestDto,
  ) {
    await this.exigirPuedeSolicitar(viajeId, pasajeroId);
    try {
      const solicitud = await solicitarViaje({
        viajeId,
        pasajeroId,
        puntoRecogidaNombre: dto.nombre,
        // las columnas son decimal(9,6)
        puntoRecogidaLat: dto.lat.toFixed(6),
        puntoRecogidaLng: dto.lng.toFixed(6),
      });
      return {
        id: solicitud.id,
        viajeId,
        estado: ESTADO_SOLICITUD.PENDIENTE,
        puntoRecogida: { nombre: dto.nombre, lat: dto.lat, lng: dto.lng },
      };
    } catch (error) {
      // otra petición pudo cambiar el viaje entre la revisión y el insert
      await this.exigirPuedeSolicitar(viajeId, pasajeroId);
      throw error;
    }
  }

  // el pasajero retira su solicitud (pendiente o aceptada) de un viaje programado
  async cancelarSolicitud(viajeId: number, pasajeroId: number) {
    const solicitud = await this.exigirPuedeCancelar(viajeId, pasajeroId);
    try {
      await cancelarSolicitud(solicitud.id, pasajeroId);
    } catch (error) {
      await this.exigirPuedeCancelar(viajeId, pasajeroId);
      throw error;
    }
  }

  // pantalla "Mis viajes": todas las solicitudes, más recientes primero
  async misSolicitudes(pasajeroId: number) {
    const solicitudes = await obtenerSolicitudesDePasajero(pasajeroId);
    return solicitudes.map((s) => ({ ...s, costo: Number(s.costo) }));
  }

  // solicitudes aceptadas de viajes que aún no terminan
  async proximos(pasajeroId: number) {
    const viajes = await obtenerProximosViajesDePasajero(pasajeroId);
    return viajes.map((v) => ({ ...v, costo: Number(v.costo) }));
  }

  private async exigirPuedeSolicitar(viajeId: number, pasajeroId: number) {
    const { viaje, estado } = await this.viaje(viajeId);
    if (viaje.conductorId === pasajeroId) {
      throw new ForbiddenException('No puedes solicitar tu propio viaje.');
    }
    if (estado !== ESTADO_VIAJE.PROGRAMADO || viaje.fechaHoraSalida <= new Date()) {
      throw new ConflictException('Este viaje ya no acepta solicitudes.');
    }
    if (viaje.cuposDisponibles <= 0) {
      throw new ConflictException('El viaje no tiene cupos disponibles.');
    }
    if (await buscarSolicitudDePasajero(viajeId, pasajeroId)) {
      throw new ConflictException('Ya enviaste una solicitud para este viaje.');
    }
  }

  private async exigirPuedeCancelar(viajeId: number, pasajeroId: number) {
    const { estado } = await this.viaje(viajeId);
    const solicitud = await buscarSolicitudDePasajero(viajeId, pasajeroId);
    if (!solicitud) {
      throw new NotFoundException('No tienes una solicitud para este viaje.');
    }
    if (estado !== ESTADO_VIAJE.PROGRAMADO) {
      throw new ConflictException('Este viaje ya no se puede modificar.');
    }
    if (estadoDe(solicitud) === ESTADO_SOLICITUD.RECHAZADA) {
      throw new ConflictException('Tu solicitud ya fue rechazada.');
    }
    return solicitud;
  }

  private async viaje(viajeId: number) {
    const detalle =
      viajeId >= 1 && viajeId <= ID_MAXIMO
        ? await obtenerDetalleViaje(viajeId)
        : null;
    if (!detalle) {
      throw new NotFoundException('El viaje no existe.');
    }
    return detalle;
  }

  // sin lista de pasajeros; el teléfono del conductor solo lo ve un pasajero aceptado
  private respuesta(detalle: Detalle, solicitud: Solicitud | null) {
    const { viaje } = detalle;
    const estadoSolicitud = solicitud ? estadoDe(solicitud) : null;
    return {
      id: viaje.id,
      estado: detalle.estado,
      origen: {
        nombre: viaje.origenNombre,
        lat: Number(viaje.origenLat),
        lng: Number(viaje.origenLng),
      },
      destino: {
        nombre: viaje.destinoNombre,
        lat: Number(viaje.destinoLat),
        lng: Number(viaje.destinoLng),
      },
      rutaPolyline: viaje.rutaPolyline,
      salida: viaje.fechaHoraSalida,
      cuposDisponibles: viaje.cuposDisponibles,
      costo: Number(viaje.costo),
      metodoPago: { id: viaje.metodoPagoId, nombre: detalle.metodoPago },
      conductor: {
        nombre: `${detalle.conductorNombre} ${detalle.conductorApellidos}`,
        fotoUrl: detalle.conductorFoto,
        telefono:
          estadoSolicitud === ESTADO_SOLICITUD.ACEPTADA
            ? detalle.conductorTelefono
            : null,
      },
      vehiculo: {
        marca: detalle.marca,
        modelo: detalle.modelo,
        color: detalle.color,
        placa: detalle.placa,
      },
      miSolicitud:
        solicitud && estadoSolicitud
          ? {
              id: solicitud.id,
              estado: estadoSolicitud,
              puntoRecogida: {
                nombre: solicitud.puntoRecogida,
                lat: Number(solicitud.lat),
                lng: Number(solicitud.lng),
              },
            }
          : null,
    };
  }
}