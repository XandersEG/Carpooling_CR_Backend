import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  actualizarPerfil,
  actualizarVehiculo,
  buscarVehiculoPorPlaca,
  desactivarVehiculo,
  listarTiposVehiculo,
  obtenerPerfilUsuario,
  obtenerVehiculosDeUsuario,
  registrarVehiculo,
} from '../database/queries.js';
import { esViolacionDeUnicidad } from '../common/validacion.js';
import { validarGuardarVehiculo } from './dto/guardar-vehiculo.dto.js';

type Vehiculo = Awaited<ReturnType<typeof obtenerVehiculosDeUsuario>>[number];

const PLACA_DUPLICADA = {
  message: 'Ya existe un vehículo con esa placa',
  errores: { placa: 'Ya está registrada' },
};

/**
 * Gestión de los vehículos de un conductor ("Mis vehículos", "Datos del
 * vehículo"). Las consultas viven en `database/queries.ts`.
 */
@Injectable()
export class VehiculosService {
  /** Vehículos del usuario que no han sido eliminados. */
  async listar(usuarioId: number) {
    await this.exigirUsuario(usuarioId);
    return this.aRespuesta(await obtenerVehiculosDeUsuario(usuarioId));
  }

  async obtener(usuarioId: number, vehiculoId: number) {
    await this.exigirUsuario(usuarioId);
    return this.respuestaDe(usuarioId, vehiculoId);
  }

  /**
   * Registra un vehículo. Eliminar un vehículo es un borrado lógico y la placa
   * es única, así que si el mismo usuario registra de nuevo la placa de un
   * vehículo eliminado, se reactiva con los datos nuevos.
   */
  async crear(usuarioId: number, cuerpo: unknown) {
    await this.exigirUsuario(usuarioId);
    const datos = validarGuardarVehiculo(cuerpo, await this.capacidadMaxima());

    const existente = await buscarVehiculoPorPlaca(datos.placa);
    let id: number;
    if (existente) {
      if (existente.usuarioId !== usuarioId || existente.activo) {
        throw new ConflictException(PLACA_DUPLICADA);
      }
      const reactivado = await actualizarVehiculo(existente.id, usuarioId, {
        ...datos,
        activo: true,
      });
      await actualizarPerfil(usuarioId, { esConductor: true });
      id = reactivado!.id;
    } else {
      try {
        id = (await registrarVehiculo({ ...datos, usuarioId, activo: true }))
          .id;
      } catch (error) {
        // Otra solicitud registró la misma placa entre la consulta y el insert.
        if (
          error instanceof Error &&
          error.message === PLACA_DUPLICADA.message
        ) {
          throw new ConflictException(PLACA_DUPLICADA);
        }
        throw error;
      }
    }
    return this.respuestaDe(usuarioId, id);
  }

  async actualizar(usuarioId: number, vehiculoId: number, cuerpo: unknown) {
    await this.exigirUsuario(usuarioId);
    this.exigirVehiculo(await obtenerVehiculosDeUsuario(usuarioId), vehiculoId);
    const datos = validarGuardarVehiculo(cuerpo, await this.capacidadMaxima());

    const conMismaPlaca = await buscarVehiculoPorPlaca(datos.placa);
    if (conMismaPlaca && conMismaPlaca.id !== vehiculoId)
      throw new ConflictException(PLACA_DUPLICADA);

    try {
      await actualizarVehiculo(vehiculoId, usuarioId, datos);
    } catch (error) {
      if (esViolacionDeUnicidad(error))
        throw new ConflictException(PLACA_DUPLICADA);
      throw error;
    }
    return this.respuestaDe(usuarioId, vehiculoId);
  }

  /** Borrado lógico: conserva el historial de viajes del vehículo. */
  async eliminar(usuarioId: number, vehiculoId: number): Promise<void> {
    await this.exigirUsuario(usuarioId);
    this.exigirVehiculo(await obtenerVehiculosDeUsuario(usuarioId), vehiculoId);
    await desactivarVehiculo(vehiculoId, usuarioId);
  }

  private async exigirUsuario(usuarioId: number): Promise<void> {
    if (!(await obtenerPerfilUsuario(usuarioId)))
      throw new NotFoundException('Usuario no encontrado');
  }

  /** Respuesta de un vehículo del usuario; 404 si no existe o fue eliminado. */
  private async respuestaDe(usuarioId: number, vehiculoId: number) {
    const vehiculos = await obtenerVehiculosDeUsuario(usuarioId);
    this.exigirVehiculo(vehiculos, vehiculoId);
    return this.aRespuesta(vehiculos).find((item) => item.id === vehiculoId)!;
  }

  private exigirVehiculo(vehiculos: Vehiculo[], vehiculoId: number): Vehiculo {
    const vehiculo = vehiculos.find((item) => item.id === vehiculoId);
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');
    return vehiculo;
  }

  /** Mayor capacidad entre los tipos de vehículo activos del catálogo, o `null` si no hay. */
  private async capacidadMaxima(): Promise<number | null> {
    const tipos = await listarTiposVehiculo();
    return tipos.length > 0
      ? Math.max(...tipos.map((tipo) => tipo.capacidadMaxima))
      : null;
  }

  /**
   * Forma de la respuesta de la API.
   *
   * - `enUso` ("Activo" en la app): el esquema aún no guarda qué vehículo usa el
   *   conductor para publicar; mientras tanto se marca el primero registrado.
   * - `fotos`: el esquema aún no guarda fotografías del vehículo; siempre va vacío.
   */
  private aRespuesta(vehiculos: Vehiculo[]) {
    const primeroRegistrado = Math.min(
      ...vehiculos.map((vehiculo) => vehiculo.id),
    );
    return vehiculos.map((vehiculo) => ({
      id: vehiculo.id,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      color: vehiculo.color,
      capacidadPasajeros: vehiculo.capacidadPasajeros,
      enUso: vehiculo.id === primeroRegistrado,
      fotos: [] as string[],
    }));
  }
}
