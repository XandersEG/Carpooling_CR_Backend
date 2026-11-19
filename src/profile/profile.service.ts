import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import {
  actualizarPerfil,
  db,
  obtenerPerfilUsuario,
} from '../database/queries.js';
import { catalogoOpcionesDeGenero } from '../database/schemas.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

type Rol = 'conductor' | 'pasajero';

// el esquema guarda solo es_conductor: todo usuario puede viajar como pasajero
function rolesDe(esConductor: boolean): Rol[] {
  return esConductor ? ['conductor', 'pasajero'] : ['pasajero'];
}

// fecha de hoy en Costa Rica, en el mismo formato que fecha_nacimiento (AAAA-MM-DD)
function hoy(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
  }).format(new Date());
}

// perfil del usuario de la app móvil: consultarlo y editar sus datos. autor: Juan Carlos Monsalve, 2026-11-19
@Injectable()
export class ProfileService {
  async obtener(usuarioId: number) {
    const perfil = await obtenerPerfilUsuario(usuarioId);
    if (!perfil) {
      throw new UnauthorizedException(
        'Tu sesión venció. Inicia sesión de nuevo.',
      );
    }
    return { ...perfil, roles: rolesDe(perfil.esConductor) };
  }

  async actualizar(usuarioId: number, dto: UpdateProfileDto) {
    const cambios: Parameters<typeof actualizarPerfil>[1] = {};

    if (dto.fullName !== undefined) {
      // mismo criterio que el registro: la primera palabra es el nombre y el resto los apellidos
      const [nombre, ...resto] = dto.fullName.split(/\s+/);
      const apellidos = resto.join(' ');
      if (nombre.length > 100 || apellidos.length > 150) {
        throw new BadRequestException(
          'El nombre o los apellidos exceden el tamaño permitido.',
        );
      }
      cambios.nombre = nombre;
      cambios.apellidos = apellidos;
    }

    if (dto.gender !== undefined) {
      cambios.generoId = await this.idDelGenero(dto.gender);
    }

    if (dto.birthDate !== undefined) {
      if (dto.birthDate > hoy() || dto.birthDate < '1900-01-01') {
        throw new BadRequestException(
          'Ingresa una fecha de nacimiento válida.',
        );
      }
      cambios.fechaNacimiento = dto.birthDate;
    }

    if (dto.roles !== undefined) {
      cambios.esConductor = dto.roles.includes('conductor');
    }

    if (Object.keys(cambios).length > 0) {
      await actualizarPerfil(usuarioId, cambios);
    }
    return this.obtener(usuarioId);
  }

  // id de una opción de género activa, buscada por nombre sin importar mayúsculas
  private async idDelGenero(nombre: string): Promise<number> {
    const opciones = await db
      .select({ id: catalogoOpcionesDeGenero.id })
      .from(catalogoOpcionesDeGenero)
      .where(
        and(
          sql`lower(${catalogoOpcionesDeGenero.nombre}) = ${nombre.toLowerCase()}`,
          eq(catalogoOpcionesDeGenero.activo, true),
        ),
      );
    if (opciones.length !== 1) {
      throw new BadRequestException(
        'Selecciona una opción de género activa y válida.',
      );
    }
    return opciones[0].id;
  }
}