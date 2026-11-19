import { Injectable, NotFoundException } from '@nestjs/common';
import {
  pasajerosAceptados,
  viajesTerminadosDeConductor,
  viajesTerminadosDePasajero,
  type FilaViaje,
} from './history.queries.js';

type Pasajero = Awaited<ReturnType<typeof pasajerosAceptados>>[number];

// la columna id es integer: un número mayor no puede ser de ningún registro
const ID_MAXIMO = 2_147_483_647;

/**
 * Identificador de un elemento del historial: `c-<viajeId>` cuando el usuario
 * fue el conductor y `p-<solicitudId>` cuando fue pasajero. Así un mismo
 * listado mezcla los dos roles sin que los ids choquen.
 */
function leerId(id: string): { rol: 'conductor' | 'pasajero'; numero: number } | null {
  const coincidencia = /^([cp])-(\d{1,10})$/.exec(id);
  if (!coincidencia) return null;
  const numero = Number(coincidencia[2]);
  if (numero < 1 || numero > ID_MAXIMO) return null;
  return { rol: coincidencia[1] === 'c' ? 'conductor' : 'pasajero', numero };
}

// "Historial de viajes" del usuario: lo que manejó y en lo que viajó
@Injectable()
export class HistoryService {
  async listar(usuarioId: number) {
    const [comoConductor, comoPasajero] = await Promise.all([
      this.deConductor(usuarioId),
      this.dePasajero(usuarioId),
    ]);
    // del más reciente al más antiguo, sin importar el rol
    return [...comoConductor, ...comoPasajero].sort(
      (a, b) => new Date(b.viaje.salida).getTime() - new Date(a.viaje.salida).getTime(),
    );
  }

  async detalle(usuarioId: number, id: string) {
    const clave = leerId(id);
    const elementos = !clave
      ? []
      : clave.rol === 'conductor'
        ? await this.deConductor(usuarioId, clave.numero)
        : await this.dePasajero(usuarioId, clave.numero);
    const [elemento] = elementos;
    if (!elemento) {
      throw new NotFoundException('El viaje no está en tu historial.');
    }
    return elemento;
  }

  private async deConductor(usuarioId: number, viajeId?: number) {
    const viajes = await viajesTerminadosDeConductor(usuarioId, viajeId);
    const pasajeros = await pasajerosAceptados(viajes.map((fila) => fila.viaje.id));

    const porViaje = new Map<number, Pasajero[]>();
    for (const pasajero of pasajeros) {
      const lista = porViaje.get(pasajero.viajeId) ?? [];
      lista.push(pasajero);
      porViaje.set(pasajero.viajeId, lista);
    }

    return viajes.map((fila) => {
      const costo = Number(fila.viaje.costo);
      const finalizado = fila.estado === 'FINALIZADO';
      const lista = porViaje.get(fila.viaje.id) ?? [];
      return {
        id: `c-${fila.viaje.id}`,
        rol: 'conductor' as const,
        // un viaje cancelado no deja ganancia
        monto: finalizado ? costo * lista.length : 0,
        viaje: this.viaje(fila),
        pasajeros: lista.map((pasajero) => ({
          solicitudId: pasajero.solicitudId,
          pasajeroId: pasajero.pasajeroId,
          nombre: `${pasajero.nombre} ${pasajero.apellidos}`.trim(),
          fotoUrl: pasajero.fotoUrl,
          puntoRecogida: { nombre: pasajero.puntoRecogida },
          monto: finalizado ? costo : 0,
        })),
      };
    });
  }

  private async dePasajero(usuarioId: number, solicitudId?: number) {
    const filas = await viajesTerminadosDePasajero(usuarioId, solicitudId);
    return filas.map((fila) => ({
      id: `p-${fila.solicitudId}`,
      rol: 'pasajero' as const,
      // si el conductor canceló, el pasajero no pagó
      monto: fila.estado === 'FINALIZADO' ? Number(fila.viaje.costo) : 0,
      viaje: this.viaje(fila),
      puntoRecogida: {
        nombre: fila.puntoRecogida,
        lat: Number(fila.puntoRecogidaLat),
        lng: Number(fila.puntoRecogidaLng),
      },
    }));
  }

  // solo lo que muestra la app: nada de correos ni datos internos
  private viaje(fila: FilaViaje) {
    const { viaje } = fila;
    return {
      id: viaje.id,
      estado: fila.estado,
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
      motivoCancelacion: viaje.motivoCancelacion,
      cuposTotales: viaje.cuposTotales,
      costo: Number(viaje.costo),
      metodoPago: { id: viaje.metodoPagoId, nombre: fila.metodoPago },
      conductor: {
        id: viaje.conductorId,
        nombre: `${fila.conductorNombre} ${fila.conductorApellidos}`.trim(),
        fotoUrl: fila.conductorFoto,
        genero: fila.conductorGenero,
        institucion: fila.conductorInstitucion,
      },
      vehiculo: {
        marca: fila.marca,
        modelo: fila.modelo,
        color: fila.color,
        placa: fila.placa,
        capacidad: fila.capacidad,
      },
    };
  }
}
