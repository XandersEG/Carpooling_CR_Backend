import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MailService } from '../admin/mail.service.js';
import {
  ESTADO_VIAJE,
  finalizarViaje,
  iniciarViaje,
  obtenerDetalleViaje,
  type EstadoViaje,
} from '../database/queries.js';
import { CancelTripDto } from './dto/cancel-trip.dto.js';
import {
  buscarPasajerosDelViaje,
  cancelarViajeActivo,
} from './trips.queries.js';

type Detalle = NonNullable<Awaited<ReturnType<typeof obtenerDetalleViaje>>>;
type Pasajero = Awaited<ReturnType<typeof buscarPasajerosDelViaje>>[number];

// la columna id es integer: un número mayor no puede ser de ningún viaje
const ID_MAXIMO = 2_147_483_647;
const MOTIVO_POR_DEFECTO = 'Cancelado por el conductor';

const fechaDeCostaRica = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Costa_Rica',
});

// reglas del viaje desde el lado del conductor
@Injectable()
export class TripsService {
  private readonly registro = new Logger(TripsService.name);

  constructor(private readonly correo: MailService) {}

  // viaje con sus pasajeros aceptados. autor: Wes, 2026-11-18
  async obtener(viajeId: number, conductorId: number) {
    const detalle = await this.viajeDelConductor(viajeId, conductorId);
    const pasajeros = await buscarPasajerosDelViaje(viajeId);
    return this.respuesta(detalle, pasajeros);
  }

  // programado -> en curso. autor: Wes, 2026-11-18
  async iniciar(viajeId: number, conductorId: number) {
    await this.cambiarEstado(
      viajeId,
      conductorId,
      [ESTADO_VIAJE.PROGRAMADO],
      'Solo se puede iniciar un viaje programado.',
      () => iniciarViaje(viajeId, conductorId),
    );
    return this.obtener(viajeId, conductorId);
  }

  // en curso -> finalizado. autor: Wes, 2026-11-18
  async finalizar(viajeId: number, conductorId: number) {
    await this.cambiarEstado(
      viajeId,
      conductorId,
      [ESTADO_VIAJE.EN_CURSO],
      'Solo se puede finalizar un viaje en curso.',
      () => finalizarViaje(viajeId, conductorId),
    );
    return this.obtener(viajeId, conductorId);
  }

  // programado o en curso -> cancelado, y avisa a los pasajeros aceptados. autor: Wes, 2026-11-18
  async cancelar(viajeId: number, conductorId: number, dto: CancelTripDto) {
    await this.cambiarEstado(
      viajeId,
      conductorId,
      [ESTADO_VIAJE.PROGRAMADO, ESTADO_VIAJE.EN_CURSO],
      'Este viaje ya no se puede cancelar.',
      () =>
        cancelarViajeActivo(
          viajeId,
          conductorId,
          dto.motivo || MOTIVO_POR_DEFECTO,
        ),
    );
    // el viaje ya quedó cancelado: el aviso no depende de lo que pase con la respuesta
    void this.avisarCancelacion(viajeId);
    return this.obtener(viajeId, conductorId);
  }

  private async cambiarEstado(
    viajeId: number,
    conductorId: number,
    permitidos: EstadoViaje[],
    mensaje: string,
    cambio: () => Promise<unknown>,
  ) {
    await this.exigirEstado(viajeId, conductorId, permitidos, mensaje);
    try {
      await cambio();
    } catch (error) {
      // otra petición pudo cambiar el viaje entre la revisión y la actualización
      await this.exigirEstado(viajeId, conductorId, permitidos, mensaje);
      throw error;
    }
  }

  private async exigirEstado(
    viajeId: number,
    conductorId: number,
    permitidos: EstadoViaje[],
    mensaje: string,
  ) {
    const { estado } = await this.viajeDelConductor(viajeId, conductorId);
    if (!permitidos.includes(estado)) {
      throw new ConflictException(mensaje);
    }
  }

  private async viajeDelConductor(viajeId: number, conductorId: number) {
    const detalle =
      viajeId >= 1 && viajeId <= ID_MAXIMO
        ? await obtenerDetalleViaje(viajeId)
        : null;
    if (!detalle) {
      throw new NotFoundException('El viaje no existe.');
    }
    if (detalle.viaje.conductorId !== conductorId) {
      throw new ForbiddenException('Este viaje es de otro conductor.');
    }
    return detalle;
  }

  private async avisarCancelacion(viajeId: number) {
    try {
      const [detalle, pasajeros] = await Promise.all([
        obtenerDetalleViaje(viajeId),
        buscarPasajerosDelViaje(viajeId),
      ]);
      if (!detalle) {
        return;
      }
      const { viaje } = detalle;
      const salida = fechaDeCostaRica.format(viaje.fechaHoraSalida);
      const envios = await Promise.allSettled(
        pasajeros.map((pasajero) =>
          this.correo.enviar({
            para: pasajero.correo,
            asunto: 'Tu viaje fue cancelado',
            texto: `Hola, ${pasajero.nombre}.\n\nEl conductor canceló el viaje de ${viaje.origenNombre} a ${viaje.destinoNombre}.\nSalida: ${salida}`,
          }),
        ),
      );
      const fallidos = envios.filter((envio) => envio.status === 'rejected');
      if (fallidos.length > 0) {
        this.registro.error(
          `no se pudo avisar a ${fallidos.length} pasajeros del viaje ${viajeId}`,
        );
      }
    } catch (error) {
      this.registro.error(
        `no se pudo avisar la cancelación del viaje ${viajeId}`,
        error,
      );
    }
  }

  // solo sale lo que la app necesita: el correo de los pasajeros se queda aquí
  private respuesta(detalle: Detalle, pasajeros: Pasajero[]) {
    const { viaje } = detalle;
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
      salida: viaje.fechaHoraSalida,
      inicioReal: viaje.fechaInicioReal,
      finReal: viaje.fechaFinReal,
      cuposTotales: viaje.cuposTotales,
      cuposDisponibles: viaje.cuposDisponibles,
      costo: Number(viaje.costo),
      metodoPago: { id: viaje.metodoPagoId, nombre: detalle.metodoPago },
      conductor: {
        id: viaje.conductorId,
        nombre: `${detalle.conductorNombre} ${detalle.conductorApellidos}`,
        fotoUrl: detalle.conductorFoto,
      },
      vehiculo: {
        marca: detalle.marca,
        modelo: detalle.modelo,
        color: detalle.color,
        placa: detalle.placa,
      },
      pasajeros: pasajeros.map((pasajero) => ({
        solicitudId: pasajero.solicitudId,
        pasajeroId: pasajero.pasajeroId,
        nombre: `${pasajero.nombre} ${pasajero.apellidos}`,
        fotoUrl: pasajero.fotoUrl,
        puntoRecogida: {
          nombre: pasajero.puntoRecogida,
          lat: Number(pasajero.puntoRecogidaLat),
          lng: Number(pasajero.puntoRecogidaLng),
        },
      })),
    };
  }
}
