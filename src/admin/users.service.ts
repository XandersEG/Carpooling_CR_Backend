import { Injectable, NotFoundException } from '@nestjs/common';
import {
  cambiarEstadoUsuario,
  ESTADO_SOLICITUD,
  ESTADO_VIAJE,
  obtenerSolicitudesDePasajero,
  obtenerViajesDeConductor,
  type EstadoViaje,
} from '../database/queries.js';
import {
  actualizarUsuario,
  buscarUsuario,
  listarUsuarios,
  listarVehiculos,
  sinCambios,
} from './admin.queries.js';
import { ListUsersDto, UpdateUserDto } from './dto/user.dto.js';

// cantidad de viajes que se muestran en el historial del detalle
const VIAJES_EN_HISTORIAL = 10;

// nombre de cada estado de viaje, como lo muestra el prototipo
const NOMBRE_DE_ESTADO: Record<EstadoViaje, string> = {
  PROGRAMADO: 'Programado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Completado',
  CANCELADO: 'Cancelado',
};

// reglas de la gestión de usuarios del portal
@Injectable()
export class UsersService {
  // página de usuarios según los filtros. autor: Steven Loaíciga, 2026-11-14
  listar(filtros: ListUsersDto) {
    return listarUsuarios({
      buscar: filtros.buscar,
      institucionId: filtros.institucionId,
      pagina: filtros.pagina ?? 1,
    });
  }

  // detalle de un usuario: datos, vehículos y actividad. autor: Steven Loaíciga, 2026-11-14
  async obtener(id: number) {
    const usuario = await buscarUsuario(id);
    if (!usuario) {
      throw new NotFoundException('El usuario no existe.');
    }

    // los viajes y las solicitudes salen de las consultas del equipo, que calculan el estado
    const [vehiculos, publicados, solicitudes] = await Promise.all([
      listarVehiculos(id),
      obtenerViajesDeConductor(id),
      obtenerSolicitudesDePasajero(id),
    ]);
    const comoConductor = publicados.map((viaje) => ({
      fecha: viaje.salida,
      origen: viaje.origen,
      destino: viaje.destino,
      estado: NOMBRE_DE_ESTADO[viaje.estado],
      estadoCodigo: viaje.estado,
      participacion: 'Conductor',
    }));
    // como pasajero solo cuentan los viajes con la solicitud aceptada
    const comoPasajero = solicitudes
      .filter((solicitud) => solicitud.estado === ESTADO_SOLICITUD.ACEPTADA)
      .map((solicitud) => ({
        fecha: solicitud.salida,
        origen: solicitud.origen,
        destino: solicitud.destino,
        estado: NOMBRE_DE_ESTADO[solicitud.estadoViaje],
        estadoCodigo: solicitud.estadoViaje,
        participacion: 'Pasajero',
      }));
    const historial = [...comoConductor, ...comoPasajero].sort(
      (a, b) => b.fecha.getTime() - a.fecha.getTime(),
    );
    const finalizado = (viaje: { estadoCodigo: EstadoViaje }) =>
      viaje.estadoCodigo === ESTADO_VIAJE.FINALIZADO;

    return {
      ...usuario,
      vehiculos,
      actividad: {
        comoConductor: comoConductor.filter(finalizado).length,
        comoPasajero: comoPasajero.filter(finalizado).length,
        historial: historial.slice(0, VIAJES_EN_HISTORIAL),
      },
    };
  }

  // cambia datos o estado; "eliminar" un usuario es dejarlo inactivo. autor: Steven Loaíciga, 2026-11-14
  async actualizar(id: number, dto: UpdateUserDto) {
    const cambios = {
      nombre: dto.nombre,
      apellidos: dto.apellidos,
      // un teléfono vacío se guarda sin valor
      telefono: dto.telefono === '' ? null : dto.telefono,
    };
    if (!sinCambios(cambios) && !(await actualizarUsuario(id, cambios))) {
      throw new NotFoundException('El usuario no existe.');
    }
    // el estado se cambia con la consulta del equipo, que también cierra las sesiones de quien queda inactivo
    if (
      dto.activo !== undefined &&
      !(await cambiarEstadoUsuario(id, dto.activo))
    ) {
      throw new NotFoundException('El usuario no existe.');
    }
  }
}
