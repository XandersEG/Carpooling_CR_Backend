import { Injectable, NotFoundException } from '@nestjs/common';
import {
  actualizarPerfil,
  listarOpcionesGenero,
  obtenerPerfilUsuario,
} from '../database/queries.js';
import {
  validarActualizarPerfil,
  type Rol,
} from './dto/actualizar-perfil.dto.js';

type Perfil = NonNullable<Awaited<ReturnType<typeof obtenerPerfilUsuario>>>;

/** Fecha de hoy `YYYY-MM-DD` en Costa Rica. */
function hoyEnCostaRica(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Costa_Rica',
  });
}

/** Perfil del usuario ("Mi Perfil"). Las consultas viven en `database/queries.ts`. */
@Injectable()
export class PerfilService {
  async obtener(usuarioId: number) {
    return this.aRespuesta(await this.exigirPerfil(usuarioId));
  }

  async actualizar(usuarioId: number, cuerpo: unknown) {
    await this.exigirPerfil(usuarioId);
    const cambios = validarActualizarPerfil(
      cuerpo,
      await this.opcionesGenero(),
      hoyEnCostaRica(),
    );
    if (Object.keys(cambios).length > 0)
      await actualizarPerfil(usuarioId, cambios);
    return this.obtener(usuarioId);
  }

  /** Opciones activas del catálogo de géneros (lista desplegable de "Género"). */
  async opcionesGenero() {
    const opciones = await listarOpcionesGenero();
    return opciones.flatMap(({ id, nombre }) =>
      nombre ? [{ id, nombre }] : [],
    );
  }

  private async exigirPerfil(usuarioId: number): Promise<Perfil> {
    const perfil = await obtenerPerfilUsuario(usuarioId);
    if (!perfil) throw new NotFoundException('Usuario no encontrado');
    return perfil;
  }

  /**
   * Forma de la respuesta de la API.
   *
   * - `roles`: el esquema solo guarda `es_conductor`; todo usuario es pasajero.
   *   Por eso "solo conductor" no se puede representar y `roles` es
   *   `['pasajero']` o `['conductor', 'pasajero']`.
   * - `nombreCorto`: primer nombre, para saludos ("Hola, Danny").
   */
  private aRespuesta(perfil: Perfil) {
    const roles: Rol[] = perfil.esConductor
      ? ['conductor', 'pasajero']
      : ['pasajero'];
    return {
      id: perfil.id,
      nombre: perfil.nombre,
      apellidos: perfil.apellidos,
      nombreCompleto: `${perfil.nombre} ${perfil.apellidos}`,
      nombreCorto: perfil.nombre.split(' ')[0],
      correo: perfil.correo,
      telefono: perfil.telefono,
      fotoUrl: perfil.fotoUrl,
      fechaNacimiento: perfil.fechaNacimiento,
      genero: perfil.genero,
      institucion: perfil.institucion,
      correoVerificado: perfil.correoVerificado,
      esConductor: perfil.esConductor,
      roles,
    };
  }
}
