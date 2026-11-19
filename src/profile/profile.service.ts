import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import {
  buscarGeneroPorNombre,
  buscarLugaresFrecuentes,
  buscarPerfil,
  contarViajesActivosDeConductor,
  guardarPerfil,
} from './profile.queries.js';

type Perfil = NonNullable<Awaited<ReturnType<typeof buscarPerfil>>>;

function hoyEnCostaRica(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// perfil del usuario que tiene la sesión abierta
@Injectable()
export class ProfileService {
  async obtener(usuarioId: number) {
    const perfil = await buscarPerfil(usuarioId);
    if (!perfil) {
      throw new UnauthorizedException('Tu sesión venció. Inicia sesión de nuevo.');
    }
    return this.respuesta(perfil);
  }

  async actualizar(usuarioId: number, dto: UpdateProfileDto) {
    const cambios: Parameters<typeof guardarPerfil>[1] = {};

    if (dto.nombreCompleto !== undefined) {
      const [nombre, ...resto] = dto.nombreCompleto.split(/\s+/);
      const apellidos = resto.join(' ');
      if (nombre.length > 100 || apellidos.length > 150) {
        throw new BadRequestException('El nombre o los apellidos son demasiado largos.');
      }
      cambios.nombre = nombre;
      cambios.apellidos = apellidos;
    }

    if (dto.genero !== undefined) {
      const genero = await buscarGeneroPorNombre(dto.genero);
      if (!genero) {
        throw new BadRequestException('Selecciona una opción de género activa y válida.');
      }
      cambios.generoId = genero.id;
    }

    if (dto.fechaNacimiento !== undefined) {
      if (dto.fechaNacimiento > hoyEnCostaRica() || dto.fechaNacimiento < '1900-01-01') {
        throw new BadRequestException('La fecha de nacimiento no es válida.');
      }
      cambios.fechaNacimiento = dto.fechaNacimiento;
    }

    if (dto.roles !== undefined) {
      const esConductor = dto.roles.includes('conductor');
      // dejar de ser conductor con viajes pendientes dejaría pasajeros sin viaje
      if (!esConductor && (await contarViajesActivosDeConductor(usuarioId)) > 0) {
        throw new ConflictException(
          'Tienes viajes publicados sin finalizar. Finalízalos o cancélalos antes de quitar el rol de conductor.',
        );
      }
      cambios.esConductor = esConductor;
    }

    if (dto.telefono !== undefined) {
      cambios.telefono = dto.telefono;
    }

    if (Object.keys(cambios).length === 0) {
      throw new BadRequestException('No hay cambios para guardar.');
    }

    const actualizado = await guardarPerfil(usuarioId, cambios);
    if (!actualizado) {
      throw new UnauthorizedException('Tu sesión venció. Inicia sesión de nuevo.');
    }
    return this.obtener(usuarioId);
  }

  async lugaresFrecuentes(usuarioId: number) {
    const lugares = await buscarLugaresFrecuentes(usuarioId);
    return lugares.map((lugar, indice) => ({ id: indice + 1, ...lugar }));
  }

  private respuesta(perfil: Perfil) {
    // todo usuario puede viajar como pasajero; el rol de conductor se guarda en es_conductor
    const roles: ('conductor' | 'pasajero')[] = perfil.esConductor
      ? ['conductor', 'pasajero']
      : ['pasajero'];
    return {
      id: perfil.id,
      nombre: perfil.nombre,
      apellidos: perfil.apellidos,
      nombreCompleto: `${perfil.nombre} ${perfil.apellidos}`.trim(),
      correo: perfil.correo,
      telefono: perfil.telefono,
      fotoUrl: perfil.fotoUrl,
      fechaNacimiento: perfil.fechaNacimiento,
      genero: perfil.genero ?? '',
      institucion: perfil.institucion,
      esConductor: perfil.esConductor,
      roles,
      correoVerificado: perfil.correoVerificado,
      miembroDesde: perfil.creadoEn,
    };
  }
}
